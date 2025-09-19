import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json();
    
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const result = await sendWelcomeEmail({ name, email });
    
    if (result.success) {
      return NextResponse.json({ message: 'Welcome email sent successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in send-welcome-email API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
