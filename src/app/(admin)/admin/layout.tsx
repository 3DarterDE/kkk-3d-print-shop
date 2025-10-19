import { ReactNode } from 'react';
import { auth0 } from '@/lib/auth0';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth0.getSession();
  if (!session?.user) {
    redirect('/');
  }
  await connectToDatabase();
  const dbUser = await User.findOne({ auth0Id: (session.user as any).sub }).lean();
  if (!dbUser?.isAdmin) {
    redirect('/');
  }
  return <>{children}</>;
}


