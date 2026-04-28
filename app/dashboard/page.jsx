import { redirect } from 'next/navigation';

export default function DashboardRoot() {
  // Redirect to the dashboard overview with the catch-all route
  redirect('/dashboard');
}
