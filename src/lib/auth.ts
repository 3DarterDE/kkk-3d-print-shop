import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth0 } from '@/lib/auth0';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';
import DeletedIdentity from '@/lib/models/DeletedIdentity';
import { linkGuestOrdersToUser } from '@/lib/link-guest-orders';
import { syncNewsletterStatusForEmail } from '@/lib/sync-newsletter';

// Upsert user in DB on every session check
async function upsertUser(sessionUser: any) {
  await connectToDatabase();
  if (!sessionUser?.sub) {
    return null;
  }
  
  // Check if this is a new user
  const existingUser = await User.findOne({ auth0Id: sessionUser.sub }).lean();
  const isNewUser = !existingUser;
  
  const user = await User.findOneAndUpdate(
    { auth0Id: sessionUser.sub },
    {
      $setOnInsert: {
        auth0Id: sessionUser.sub,
        isAdmin: false
      },
      $set: {
        email: sessionUser.email,
        name: sessionUser.name,
        ...(sessionUser.email_verified === true ? { isVerified: true } : {}),
      }
    },
    { upsert: true, new: true }
  ).lean();
  
  // Link guest orders to this user if this is a new user or if email matches guest orders
  if (user && sessionUser.email) {
    try {
      const linkedCount = await linkGuestOrdersToUser(user._id.toString(), sessionUser.email);
      if (linkedCount > 0) {
        console.log(`Linked ${linkedCount} guest orders to user ${user._id} for email ${sessionUser.email}`);
      }
    } catch (error) {
      console.error('Error linking guest orders to user:', error);
      // Don't fail the user creation if order linking fails
    }
    // Also sync newsletter subscription if one exists for this email
    try {
      await syncNewsletterStatusForEmail(user._id.toString(), sessionUser.email);
    } catch (e) {
      console.warn('Failed to sync newsletter status during upsertUser:', e);
    }
  }
  
  // Note: Welcome emails for social logins are now handled by the /welcome page
  // to avoid duplicate emails and provide better user experience
  
  return user;
}

// Next.js 15: ensure async cookies API is awaited before session access
export async function requireUser() {
  await cookies();
  const session = await auth0.getSession();
  if (!session?.user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  // Suppress accidental recreation shortly after deletion
  try {
    const suppressed = await (async () => {
      await connectToDatabase();
      return await DeletedIdentity.findOne({
        auth0Id: (session.user as any).sub,
        expiresAt: { $gt: new Date() }
      }).lean();
    })();
    if (suppressed) {
      return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
  } catch {}
  // Read-only: do not create user records during guarded endpoints
  await connectToDatabase();
  const dbUser = await User.findOne({ auth0Id: (session.user as any).sub }).lean();
  if (!dbUser) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user: dbUser, response: null };
}

export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (!user) return { user: null, response };
  if (!user.isAdmin) {
    return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, response: null };
}
