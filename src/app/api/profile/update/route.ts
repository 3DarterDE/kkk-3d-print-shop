import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { auth0 } from '@/lib/auth0';

export async function PUT(request: NextRequest) {
  try {
    await cookies();
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { salutation, firstName, lastName, phone, address, billingAddress, useSameAddress, paymentMethod } = body;
    

    await connectToDatabase();
    
    const updateData: any = {};
    
    if (salutation !== undefined) updateData.salutation = salutation || null;
    if (firstName !== undefined) updateData.firstName = firstName || null;
    if (lastName !== undefined) updateData.lastName = lastName || null;
    if (phone !== undefined) updateData.phone = phone || null;
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
        phone: user.phone,
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
