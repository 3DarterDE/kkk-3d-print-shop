import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth0 } from '@/lib/auth0';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

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
  const dbUser = await upsertUser(session.user);
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
