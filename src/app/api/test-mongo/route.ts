import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET() {
  await connectToDatabase();
  try {
    const user = await User.create({
      auth0Id: 'test|123',
      email: 'test@example.com',
      name: 'Test User',
      isAdmin: false
    });
    return NextResponse.json({ success: true, user });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
