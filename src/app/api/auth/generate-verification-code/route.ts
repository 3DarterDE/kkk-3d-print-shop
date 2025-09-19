import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import VerificationCode from '@/lib/models/VerificationCode';
import { sendVerificationEmail } from '@/lib/email';
import { auth0 } from '@/lib/auth0';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

// Generate 6-digit verification code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }
    const sessionEmail = session.user.email?.toLowerCase();
    if (!sessionEmail || sessionEmail !== String(email).toLowerCase()) {
      return NextResponse.json({ error: 'E-Mail stimmt nicht überein' }, { status: 400 });
    }
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectToDatabase();

      // Skip if already verified (covers Social Logins and already-verified DB users)
      const dbUser = await User.findOne({ auth0Id: session.user.sub }).lean();
      const alreadyVerified = Boolean((session.user as any).email_verified) || dbUser?.isVerified === true;
      if (alreadyVerified) {
        return NextResponse.json({ error: 'Bereits verifiziert', reason: 'already_verified' }, { status: 400 });
      }

    // Debounce: if a code was generated in the last 15 seconds, don't send again
    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
    const recent = await VerificationCode.findOne({ email, createdAt: { $gte: fifteenSecondsAgo } }).lean();
    if (recent) {
      return NextResponse.json({ 
        message: 'Code wurde kürzlich gesendet',
        reason: 'recently_sent',
        // Provide remaining cooldown hint for UI (max 15s)
        cooldown: Math.max(1, 15 - Math.floor((Date.now() - new Date(recent.createdAt as any).getTime()) / 1000))
      });
    }

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing codes for this email
    await VerificationCode.updateMany(
      { email, used: false },
      { used: true }
    );

    // Create new verification code
    const verificationCode = new VerificationCode({
      email,
      code,
      expiresAt,
      used: false
    });

    await verificationCode.save();

    // Send verification email with code
    const result = await sendVerificationEmail({ 
      name: name || email, 
      email,
      verificationUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/activate?email=${encodeURIComponent(email)}`,
      code,
    });

    if (result.success) {
      return NextResponse.json({ 
        message: 'Verification code sent successfully',
        expiresIn: 10 * 60 // 10 minutes in seconds
      });
    } else {
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error generating verification code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
