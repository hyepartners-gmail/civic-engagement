import Layout from '@/components/Layout';
import dynamic from 'next/dynamic';

const LabPage = dynamic(() => import('@/features/lab/LabPage'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading Lab...</div>
});

export default function Page(){ return <Layout><LabPage /></Layout>; }