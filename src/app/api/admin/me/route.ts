import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { auth0 } from '@/lib/auth0';

// Returns whether the current user is admin
export async function GET() {
  await cookies();
  const session = await auth0.getSession();
  if (!session?.user) return NextResponse.json({ isAdmin: false }, { status: 401 });

  await connectToDatabase();
  const existing = await User.findOne({ auth0Id: session.user.sub }).lean();
  return NextResponse.json({ isAdmin: !!existing?.isAdmin });
}

// POST not needed: Make yourself admin by setting isAdmin: true in DB.
