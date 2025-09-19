import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import VerificationCode from '@/lib/models/VerificationCode';
import User from '@/lib/models/User';
import { auth0 } from '@/lib/auth0';
import { sendWelcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await cookies();
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email und Code sind erforderlich' }, { status: 400 });
    }

    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Ungültiger Code' }, { status: 400 });
    }

    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // Basic safety: ensure the email being verified matches the session user
    const sessionEmail = session.user.email?.toLowerCase();
    if (sessionEmail && sessionEmail !== String(email).toLowerCase()) {
      return NextResponse.json({ error: 'E-Mail stimmt nicht überein' }, { status: 400 });
    }

    await connectToDatabase();

    // Find a valid, unused code that hasn't expired
    const now = new Date();
    const doc = await VerificationCode.findOne({
      email,
      code,
      used: false,
      expiresAt: { $gt: now },
    });

    if (!doc) {
      return NextResponse.json({ error: 'Code ist ungültig oder abgelaufen' }, { status: 400 });
    }

    // Delete the code immediately after successful verification
    await VerificationCode.deleteOne({ _id: doc._id });

    // Mark user as verified in DB
    await User.updateOne(
      { auth0Id: session.user.sub },
      { $set: { isVerified: true, email } }
    );

    // Update session to reflect verification immediately (so middleware allows navigation)
    try {
      const updated = {
        ...session,
        user: {
          ...(session.user as any),
          email_verified: true,
          email,
        },
      };
      await auth0.updateSession(updated as any);
    } catch (e) {
      console.warn('verify-code: failed to update session email_verified:', e);
    }

    // Send welcome email after successful verification
    try {
      await sendWelcomeEmail({
        name: session.user.name || email,
        email: email
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the verification if email fails
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('verify-code error:', err);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
