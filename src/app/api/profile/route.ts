import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
// import Order from '@/lib/models/Order';
// import Address from '@/lib/models/Address';
import { auth0 } from '@/lib/auth0';

export async function GET() {
  await cookies();
  const session = await auth0.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const user = await User.findOne({ auth0Id: session.user.sub }).lean();
  // const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
  // const addresses = await Address.find({ userId: user._id }).lean();

  // Demo: Orders und Addresses als leeres Array
  return NextResponse.json({
    user: {
      name: user?.name,
      email: user?.email,
      isAdmin: user?.isAdmin,
      createdAt: user?.createdAt,
    },
    orders: [], // später ersetzen
    addresses: [], // später ersetzen
  });
}
