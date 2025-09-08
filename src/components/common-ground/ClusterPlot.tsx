'use client';
import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/common-ground/useApi';
import { ClusterSnapshot } from '@/types/common-ground';
import PlatformCard from '../PlatformCard';
import { colors } from '@/lib/theme';

export default function ClusterPlot({ groupId }: { groupId: string }) {
  const [isClient, setIsClient] = useState(false);
  const [ResponsiveScatterPlot, setResponsiveScatterPlot] = useState<any>(null);

  useEffect(() => {
    // Add a small delay to ensure full hydration
    const timer = setTimeout(() => {
      setIsClient(true);
      // Dynamically import Nivo only on client side
      import('@nivo/scatterplot').then((module) => {
        setResponsiveScatterPlot(() => module.ResponsiveScatterPlot);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  const { data, loading } = useApi<ClusterSnapshot>(`/api/common-ground/groups/${groupId}/clusters?version=v1`);

  // Only render chart when everything is ready
  if (!isClient || !ResponsiveScatterPlot || loading || !data) {
    return (
      <PlatformCard className="p-6 h-96 flex items-center justify-center">
        <p>
          {loading ? 'Loading clusters...' : 
           !data ? 'No cluster data available.' : 
           'Preparing chart...'}
        </p>
      </PlatformCard>
    );
  }

  const chartData = data.clusters.map(cluster => ({
    id: cluster.id,
    data: cluster.members.map(userId => {
      const point = data.pca2d.find(p => p.userId === userId);
      return { x: point?.x ?? 0, y: point?.y ?? 0, user: userId };
    }),
  }));

  // Temporarily use a simple placeholder instead of Nivo chart to avoid SSR issues
  return (
    <PlatformCard className="p-6 h-96 flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Political Clusters</h3>
      <div className="flex-1 flex items-center justify-center bg-platform-contrast/30 rounded">
        <div className="text-center">
          <p className="text-platform-text/70 mb-2">Cluster visualization</p>
          <p className="text-sm text-platform-text/50">
            {data.clusters.length} clusters with {data.pca2d.length} members
          </p>
        </div>
      </div>
    </PlatformCard>
  );
}