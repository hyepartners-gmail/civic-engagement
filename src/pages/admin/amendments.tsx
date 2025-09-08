import React from 'react';
import AdminLayout from '../../components/AdminPanel/AdminLayout';
import AmendmentManager from '../../components/AdminPanel/AmendmentManager';
import { useSession } from 'next-auth/react';

const AdminAmendments: React.FC = () => {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  return (
    <AdminLayout>
      <AmendmentManager isAdmin={isAdmin} />
    </AdminLayout>
  );
};

export default AdminAmendments;