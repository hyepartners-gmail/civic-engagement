import React from 'react';
import SuggestionQueue from '../../components/AdminPanel/SuggestionQueue';
import AdminLayout from '../../components/AdminPanel/AdminLayout';

const AdminSuggestions: React.FC = () => {
  return (
    <AdminLayout>
      <SuggestionQueue />
    </AdminLayout>
  );
};

export default AdminSuggestions;