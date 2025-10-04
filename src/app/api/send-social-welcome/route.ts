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

    // Check if user already exists in database and whether welcome was sent
    await connectToDatabase();
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser && existingUser.welcomeEmailSent === true) {
      return NextResponse.json({ message: 'User already exists, welcome already sent' });
    }

    const result = await sendWelcomeEmail({ name, email });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // Mark welcome sent (create or update user)
    if (existingUser) {
      await User.updateOne({ _id: existingUser._id }, { $set: { welcomeEmailSent: true } });
    } else {
      // Social signup may not have been upserted yet; create a minimal record to avoid re-sends
      await User.create({
        auth0Id: '',
        email: email.toLowerCase(),
        name,
        isAdmin: false,
        welcomeEmailSent: true,
      });
    }

    return NextResponse.json({ message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Error in send-social-welcome API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

