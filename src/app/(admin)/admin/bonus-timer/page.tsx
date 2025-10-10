import { redirect } from 'next/navigation';

export default function BonusTimerRedirect() {
  redirect('/admin/bonus-point-timers');
}
