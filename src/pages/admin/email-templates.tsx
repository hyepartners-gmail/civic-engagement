import React from 'react';
import EmailTemplatesManager from '../../components/AdminPanel/EmailTemplatesManager';
import AdminLayout from '../../components/AdminPanel/AdminLayout';

const AdminEmailTemplates: React.FC = () => {
  return (
    <AdminLayout>
      <EmailTemplatesManager />
    </AdminLayout>
  );
};

export default AdminEmailTemplates;