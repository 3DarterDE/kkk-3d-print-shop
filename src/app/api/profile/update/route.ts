import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { auth0 } from '@/lib/auth0';
import { verifyCsrfFromRequest } from '@/lib/csrf';
import { profileUpdateBody } from '@/lib/validation';
import { rateLimitRequest, getClientIP } from '@/lib/rate-limit';

export async function PUT(request: NextRequest) {
  try {
    // Rate limit by client IP
    const ip = getClientIP(request);
    const rl = await rateLimitRequest(`profile:${ip}`, 10, 60 * 1000);
    if (!rl.success) {
      const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      res.headers.set('Retry-After', Math.max(0, Math.ceil((rl.resetTime - Date.now()) / 1000)).toString());
      return res;
    }

    // CSRF check
    const csrfOk = await verifyCsrfFromRequest(request);
    if (!csrfOk) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
    await cookies();
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = profileUpdateBody.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    const { salutation, firstName, lastName, address, billingAddress, useSameAddress, paymentMethod } = parsed.data as any;
    

    await connectToDatabase();
    
    const updateData: any = {};
    
    if (salutation !== undefined) updateData.salutation = salutation || null;
    if (firstName !== undefined) updateData.firstName = firstName || null;
    if (lastName !== undefined) updateData.lastName = lastName || null;
    if (address !== undefined) {
      updateData.address = {
        firstName: address.firstName || null,
        lastName: address.lastName || null,
        company: address.company || null,
        street: address.street || null,
        houseNumber: address.houseNumber || null,
        addressLine2: address.addressLine2 || null,
        city: address.city || null,
        postalCode: address.postalCode || null,
        country: address.country || 'Deutschland'
      };
    }
    if (billingAddress !== undefined) {
      updateData.billingAddress = {
        firstName: billingAddress.firstName || null,
        lastName: billingAddress.lastName || null,
        company: billingAddress.company || null,
        street: billingAddress.street || null,
        houseNumber: billingAddress.houseNumber || null,
        addressLine2: billingAddress.addressLine2 || null,
        city: billingAddress.city || null,
        postalCode: billingAddress.postalCode || null,
        country: billingAddress.country || 'Deutschland'
      };
    }
    if (useSameAddress !== undefined) updateData.useSameAddress = useSameAddress;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;

    // Update name field if firstName or lastName changed
    if (firstName || lastName) {
      updateData.name = `${firstName || ''} ${lastName || ''}`.trim();
    }

    const user = await User.findOneAndUpdate(
      { auth0Id: session.user.sub },
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        salutation: user.salutation,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        address: user.address,
        billingAddress: user.billingAddress,
        useSameAddress: user.useSameAddress,
        paymentMethod: user.paymentMethod,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
