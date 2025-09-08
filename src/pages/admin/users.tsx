import React from 'react';
import UserManager from '../../components/AdminPanel/UserManager';
import AdminLayout from '../../components/AdminPanel/AdminLayout';

const AdminUsers: React.FC = () => {
  return (
    <AdminLayout>
      <UserManager />
    </AdminLayout>
  );
};

export default AdminUsers;