'use client';
import { useMemo } from 'react';
import ChartCard from '@/components/charts/ChartCard';
import { useEmploymentData } from '@/hooks/useEmploymentData';
import { useGdpData } from '@/hooks/useGdpData';
import { diffMonthly, rollupFYSum, detectOutliers } from '@/lib/employmentSelectors';
import GDPColorLegend from '@/components/employment/narratives/GDPColorLegend';
import CompareFYs from '@/components/employment/narratives/CompareFYs';
import dynamic from 'next/dynamic';

const FYJobsBarChart = dynamic(() => import('@/components/employment/narratives/FYJobsBarChart'), { ssr: false });

export default function StoryOneYear() {
  const { data: artifact, isLoading: isLoadingArtifact } = useEmploymentData();
  const { data: gdpData, isLoading: isLoadingGdp } = useGdpData();

  const { chartData, outliers } = useMemo(() => {
    if (!artifact) return { chartData: [], outliers: [] };

    const netChangeMonthly = diffMonthly(artifact.series.ces_total_nonfarm);
    const netChangeFY = rollupFYSum(netChangeMonthly, artifact);
    
    // Handle case where GDP data is not available
    const gdpMap = new Map<number, number>();
    if (gdpData && gdpData.length > 0) {
      gdpData.forEach(d => gdpMap.set(d.year, d.gdp_growth_pct));
    }

    const data = Array.from(netChangeFY.entries()).map(([fy, jobs]) => {
      const gdpGrowth = gdpMap.get(fy); // Will be undefined if no GDP data
      return {
        fy,
        jobs: jobs / 1000, // Convert from thousands to millions
        gdpGrowth,
      };
    });

    // Only detect outliers if we have GDP data
    const detectedOutliers = gdpData && gdpData.length > 0 ? detectOutliers(data) : [];

    return { chartData: data, outliers: detectedOutliers };
  }, [artifact, gdpData]);

  if (isLoadingArtifact || isLoadingGdp) {
    return <div>Loading narrative data...</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <ChartCard
          title="Net Jobs Created/Lost by Fiscal Year"
          subtitle="Bars colored by annual GDP growth. Outliers show divergence."
          aria-label="Chart showing net job changes by fiscal year, with bars colored according to the corresponding annual GDP growth rate."
        >
          <FYJobsBarChart data={chartData} outliers={outliers} />
        </ChartCard>
      </div>
      <ChartCard title="Compare Fiscal Years">
        <CompareFYs data={chartData} />
      </ChartCard>
      <ChartCard title="GDP Growth Legend">
        <GDPColorLegend />
      </ChartCard>
    </div>
  );
}