'use client';

import MainLayout from '@/components/MainLayout';
import { useRouter } from 'next/router';
import { CATEGORIES } from '@/lib/common-ground/categories';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Dynamically import all chart components to avoid SSR issues
const ClusterPlot = dynamic(() => import('@/components/common-ground/ClusterPlot'), {
  ssr: false,
  loading: () => <div className="h-64 bg-platform-contrast rounded-lg animate-pulse flex items-center justify-center">
    <span className="text-platform-text/50">Loading cluster plot...</span>
  </div>
});

const CategoryHeatmap = dynamic(() => import('@/components/common-ground/CategoryHeatmap'), {
  ssr: false,
  loading: () => <div className="h-64 bg-platform-contrast rounded-lg animate-pulse flex items-center justify-center">
    <span className="text-platform-text/50">Loading heatmap...</span>
  </div>
});

const CategoryRollupCard = dynamic(() => import('@/components/common-ground/CategoryRollupCard'), {
  ssr: false,
  loading: () => <div className="h-32 bg-platform-contrast rounded-lg animate-pulse"></div>
});

export default function GroupDashboardPage() {
  const router = useRouter();
  const { groupId } = router.query;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!groupId || typeof groupId !== 'string') {
    return <MainLayout><p>Loading...</p></MainLayout>;
  }

  if (!isClient) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <h1 className="text-3xl font-thin text-platform-accent mb-4">Group Dashboard</h1>
          <div className="space-y-8">
            <div className="h-64 bg-platform-contrast rounded-lg animate-pulse flex items-center justify-center">
              <span className="text-platform-text/50">Loading dashboard...</span>
            </div>
            <div className="h-64 bg-platform-contrast rounded-lg animate-pulse flex items-center justify-center">
              <span className="text-platform-text/50">Loading charts...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-platform-contrast rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <h1 className="text-3xl font-thin text-platform-text mb-4">Group Dashboard</h1>
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Political Clusters</h2>
          <ClusterPlot groupId={groupId} />
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">Category Alignment</h2>
          <CategoryHeatmap groupId={groupId} />
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">Category Drill-Down</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map(cat => (
              <CategoryRollupCard key={cat.id} category={cat} groupId={groupId} />
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}