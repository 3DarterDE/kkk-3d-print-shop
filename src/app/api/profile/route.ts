import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';
// import Address from '@/lib/models/Address';
import { auth0 } from '@/lib/auth0';

export async function GET() {
  await cookies();
  const session = await auth0.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const user = await User.findOne({ auth0Id: session.user.sub }).lean();
  const orders = await Order.find({ userId: user._id.toString() }).sort({ createdAt: -1 }).limit(5).lean();
  // const addresses = await Address.find({ userId: user._id }).lean();
  return NextResponse.json({
    user: {
      name: user?.name,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      phone: user?.phone,
      dateOfBirth: user?.dateOfBirth,
      address: {
        street: user?.address?.street,
        houseNumber: user?.address?.houseNumber,
        addressLine2: user?.address?.addressLine2,
        city: user?.address?.city,
        postalCode: user?.address?.postalCode,
        country: user?.address?.country
      },
      billingAddress: {
        street: user?.billingAddress?.street,
        houseNumber: user?.billingAddress?.houseNumber,
        addressLine2: user?.billingAddress?.addressLine2,
        city: user?.billingAddress?.city,
        postalCode: user?.billingAddress?.postalCode,
        country: user?.billingAddress?.country
      },
      paymentMethod: user?.paymentMethod,
      isAdmin: user?.isAdmin,
      isVerified: user?.isVerified,
      createdAt: user?.createdAt,
    },
    orders: orders || [],
    addresses: [], // später ersetzen
  });
}
