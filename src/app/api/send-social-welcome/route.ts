import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json();
    
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Check if user already exists in database
    await connectToDatabase();
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      // User already exists, don't send welcome email
      return NextResponse.json({ message: 'User already exists, no welcome email sent' });
    }

    const result = await sendWelcomeEmail({ name, email });
    
    if (result.success) {
      return NextResponse.json({ message: 'Welcome email sent successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in send-social-welcome API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
