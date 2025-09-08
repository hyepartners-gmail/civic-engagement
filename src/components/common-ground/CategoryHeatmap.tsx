'use client';
import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/common-ground/useApi';
import { CategoryVector } from '@/types/common-ground';
import { CATEGORIES } from '@/lib/common-ground/categories';
import PlatformCard from '../PlatformCard';
import { colors } from '@/lib/theme';

export default function CategoryHeatmap({ groupId }: { groupId: string }) {
  const [isClient, setIsClient] = useState(false);
  const [ResponsiveHeatMap, setResponsiveHeatMap] = useState<any>(null);

  useEffect(() => {
    // Add a small delay to ensure full hydration
    const timer = setTimeout(() => {
      setIsClient(true);
      // Dynamically import Nivo only on client side
      import('@nivo/heatmap').then((module) => {
        setResponsiveHeatMap(() => module.ResponsiveHeatMap);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  const { data, loading } = useApi<CategoryVector[]>(`/api/common-ground/groups/${groupId}/category-vectors?version=v1`);

  // Only render chart when everything is ready
  if (!isClient || !ResponsiveHeatMap || loading || !data) {
    return (
      <PlatformCard className="p-6 h-96 flex items-center justify-center">
        <p>
          {loading ? 'Loading heatmap...' : 
           !data ? 'No heatmap data available.' : 
           'Preparing chart...'}
        </p>
      </PlatformCard>
    );
  }

  const chartData = data.map(vector => ({
    id: vector.userId,
    data: vector.scores.map((score, i) => ({
      x: CATEGORIES[i].name,
      y: score,
    })),
  }));

  // Temporarily use a simple placeholder instead of Nivo chart to avoid SSR issues
  return (
    <PlatformCard className="p-6 h-96 flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Category Alignment Heatmap</h3>
      <div className="flex-1 flex items-center justify-center bg-platform-contrast/30 rounded">
        <div className="text-center">
          <p className="text-platform-text/70 mb-2">Heatmap visualization</p>
          <p className="text-sm text-platform-text/50">
            {data.length} users across {CATEGORIES.length} categories
          </p>
        </div>
      </div>
    </PlatformCard>
  );
}