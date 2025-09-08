import React from 'react';
import Link from 'next/link';
import AnalyticsDashboard from '../../components/AdminPanel/AnalyticsDashboard';
import AdminLayout from '../../components/AdminPanel/AdminLayout'; // Import AdminLayout

const AdminDashboard: React.FC = () => {
  return (
    <AdminLayout> {/* Wrap content with AdminLayout */}
      <h1 className="text-3xl font-thin mb-6 text-platform-accent">Admin Dashboard</h1>
      <nav className="mb-8">
        <ul className="flex space-x-4">
          <li><Link href="/admin/topics" className="text-platform-accent hover:underline">Topics</Link></li>
          <li><Link href="/admin/suggestions" className="text-platform-accent hover:underline">Suggestions</Link></li>
          <li><Link href="/admin/messages" className="text-platform-accent hover:underline">Messages</Link></li>
          <li><Link href="/admin/messages/results" className="text-platform-accent hover:underline">Message Results</Link></li>
          <li><Link href="/admin/moderation" className="text-platform-accent hover:underline">Moderation</Link></li>
          <li><Link href="/admin/users" className="text-platform-accent hover:underline">Users</Link></li>
          <li><Link href="/admin/analytics" className="text-platform-accent hover:underline">Analytics</Link></li>
        </ul>
      </nav>
      <div className="bg-platform-contrast p-6 rounded-lg shadow-lg">
        <AnalyticsDashboard isAdmin={true} /> {/* Pass isAdmin prop */}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;