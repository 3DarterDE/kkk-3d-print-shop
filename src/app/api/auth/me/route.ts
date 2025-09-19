import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { auth0 } from '@/lib/auth0';
import crypto from 'crypto';

// Upsert user in DB on every session check
async function upsertUser(sessionUser: any) {
  await connectToDatabase();
  if (!sessionUser?.sub) {
    return null;
  }
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
        // If Auth0 indicates verified, persist isVerified=true as well
        ...(sessionUser.email_verified === true ? { isVerified: true } : {}),
      }
    },
    { upsert: true, new: true }
  ).lean();
  return user;
}

export async function GET() {
  await cookies();
  const session = await auth0.getSession();
  if (!session?.user) {
    // Return 200 with authenticated=false to avoid noisy client errors when logged out
    return NextResponse.json({ authenticated: false, isAdmin: false, user: null }, { status: 200 });
  }

  // Upsert user to ensure they exist in database
  const dbUser = await upsertUser(session.user);
  const isAdmin = dbUser?.isAdmin === true;
  // Consider user verified if either DB flag is true OR Auth0 says email_verified=true
  const emailVerifiedFromAuth0 = Boolean((session.user as any).email_verified);
  const isVerified = (dbUser?.isVerified === true) || emailVerifiedFromAuth0 === true;


  return NextResponse.json({ 
    authenticated: true, 
    isAdmin, 
    needsVerification: !isVerified,
    user: {
      sub: session.user.sub,
      email: session.user.email,
      name: session.user.name,
      email_verified: isVerified,
    }
  });
}
