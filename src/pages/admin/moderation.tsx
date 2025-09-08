import React from 'react';
import ModerationQueue from '../../components/AdminPanel/ModerationQueue';
import AdminLayout from '../../components/AdminPanel/AdminLayout';

const AdminModeration: React.FC = () => {
  return (
    <AdminLayout>
      <ModerationQueue />
    </AdminLayout>
  );
};

export default AdminModeration;