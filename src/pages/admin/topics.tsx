import React from 'react';
import TopicManager from '../../components/AdminPanel/TopicManager';
import AdminLayout from '../../components/AdminPanel/AdminLayout'; // Assuming a layout component

const AdminTopics: React.FC = () => {
  return (
    <AdminLayout>
      <TopicManager />
    </AdminLayout>
  );
};

export default AdminTopics;