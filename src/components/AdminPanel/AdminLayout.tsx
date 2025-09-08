import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import MainLayout from '../MainLayout';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAdmin = (session?.user as any)?.role === 'admin';

  useEffect(() => {
    if (status === 'loading') return; // Do nothing while session is loading

    if (status === 'unauthenticated' || !isAdmin) {
      // Redirect to auth page if not authenticated or not an admin
      router.push('/auth');
    }
  }, [status, isAdmin, router]);

  if (status === 'loading' || !isAdmin) {
    // Show a loading/access denied message while checking or if not admin
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8 font-normal">
            {status === 'loading' ? 'Loading admin session...' : 'Access Denied: Admin privileges required. Redirecting...'}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <h1 className="text-2xl sm:text-3xl font-thin mb-4 sm:mb-6 text-platform-text">Admin Dashboard</h1>
      <nav className="mb-6 sm:mb-8">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm sm:text-base">
          <li><Link href="/admin/topics" className="text-platform-accent hover:underline font-medium">Topics</Link></li>
          <li><Link href="/admin/suggestions" className="text-platform-accent hover:underline font-medium">Suggestions</Link></li>
          <li><Link href="/admin/messages" className="text-platform-accent hover:underline font-medium">Messages</Link></li>
          <li><Link href="/admin/messages/results" className="text-platform-accent hover:underline font-medium">Message Results</Link></li>
          <li><Link href="/admin/moderation" className="text-platform-accent hover:underline font-medium">Moderation</Link></li>
          <li><Link href="/admin/users" className="text-platform-accent hover:underline font-medium">Users</Link></li>
          <li><Link href="/admin/analytics" className="text-platform-accent hover:underline font-medium">Analytics</Link></li>
          <li><Link href="/admin/email-templates" className="text-platform-accent hover:underline font-medium">Email Templates</Link></li>
        </ul>
      </nav>
      <div className="bg-platform-contrast p-4 sm:p-6 rounded-lg shadow-lg">
        {children}
      </div>
    </MainLayout>
  );
};

export default AdminLayout;