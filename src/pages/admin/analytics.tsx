import React from 'react';
import AnalyticsDashboard from '../../components/AdminPanel/AnalyticsDashboard';
import AdminLayout from '../../components/AdminPanel/AdminLayout';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const AdminAnalytics: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAdmin = (session?.user as any)?.role === 'admin';

  if (status === 'loading') {
    return (
      <AdminLayout>
        <div className="text-center p-8 font-normal">Loading admin session...</div>
      </AdminLayout>
    );
  }

  if (status === 'unauthenticated' || !isAdmin) {
    // Redirect to auth page if not authenticated or not an admin
    router.push('/auth');
    return (
      <AdminLayout>
        <div className="text-center p-8 font-normal text-red-400">Access Denied: Admin privileges required. Redirecting...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AnalyticsDashboard isAdmin={isAdmin} />
    </AdminLayout>
  );
};

export default AdminAnalytics;