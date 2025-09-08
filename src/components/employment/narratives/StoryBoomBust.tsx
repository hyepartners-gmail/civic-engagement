'use client';
import { useMemo, useState } from 'react';
import ChartCard from '@/components/charts/ChartCard';
import { useEmploymentData } from '@/hooks/useEmploymentData';
import { useRecessions } from '@/hooks/useRecessions';
import { diffMonthly, findPeakTroughRecovery, medianRecovery, deflate } from '@/lib/employmentSelectors';
import NetChangeBarcode from '@/components/charts/NetChangeBarcode';
import RealWagePanel from '@/components/charts/RealWagePanel';
import { fmtShort } from '@/utils/number';
import dynamic from 'next/dynamic';

const MonthlyNetChangeBarChart = dynamic(() => import('@/components/employment/narratives/MonthlyNetChangeBarChart'), { ssr: false });

export default function StoryBoomBust() {
  const { data: artifact, isLoading: isLoadingEmployment } = useEmploymentData();
  const { data: recessionsData, isLoading: isLoadingRecessions } = useRecessions(); // Renamed to avoid conflict
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showRecoveryPaths, setShowRecoveryPaths] = useState(false);

  // Ensure recessions is always an array
  const recessions = recessionsData || [];

  const { netChange, recoveries, medianMonths, realWages } = useMemo(() => {
    if (!artifact) {
      console.log("[StoryBoomBust] Memo: Artifact is null.");
      return { netChange: [], recoveries: [], medianMonths: null, realWages: [] };
    }

    // Ensure the correct series key is used, handling potential variations
    const totalNonfarmKey = 'ces.total_nonfarm';
    const totalNonfarmSeries = artifact.series[totalNonfarmKey] || artifact.series[totalNonfarmKey.replace(/\./g, '_')];
    
    const aheKey = 'ces.ahe_total_private';
    const aheSeries = artifact.series[aheKey] || artifact.series[aheKey.replace(/\./g, '_')];

    const cpiKey = 'cpi.u_all_items';
    const cpiSeries = artifact.series[cpiKey] || artifact.series[cpiKey.replace(/\./g, '_')];

    if (!totalNonfarmSeries) {
      console.warn(`[StoryBoomBust] Memo: Missing 'ces.total_nonfarm' series in artifact.`);
      return { netChange: [], recoveries: [], medianMonths: null, realWages: [] };
    }
    
    const change = diffMonthly(totalNonfarmSeries);
    console.log("[StoryBoomBust] Memo: netChange calculated. Length:", change.length, "Sample:", change.slice(0, 5));

    const recs = (recessions && totalNonfarmSeries) ? findPeakTroughRecovery(totalNonfarmSeries, artifact.index, recessions) : [];
    console.log("[StoryBoomBust] Memo: recoveries calculated. Length:", recs.length, "Sample:", recs.slice(0, 2));

    const median = medianRecovery(recs);
    console.log("[StoryBoomBust] Memo: medianMonths calculated:", median);

    // Only attempt to deflate if both AHE and CPI series are available
    const wages = (aheSeries && cpiSeries) ? deflate(aheSeries, cpiSeries) : [];
    console.log("[StoryBoomBust] Memo: realWages calculated. Length:", wages.length, "Sample:", wages.slice(0, 5));

    return {
      netChange: artifact.index.map((d, i) => ({ date: d.date, value: change[i] })),
      recoveries: recs,
      medianMonths: median,
      realWages: artifact.index.map((d, i) => ({ x: new Date(d.date), y: wages[i] })),
    };
  }, [artifact, recessions]); // Added recessions to dependencies

  if (isLoadingEmployment || isLoadingRecessions) {
    return <div>Loading narrative data...</div>;
  }

  if (!artifact || !recessions) { // Check recessions here too
    return (
      <ChartCard
        title="The Jobs Rollercoaster: Boom, Bust, Recovery"
        subtitle="Monthly net job change since 1939. Shaded areas are recessions."
      >
        <div className="flex items-center justify-center h-full text-platform-text/70 bg-platform-contrast/30 rounded-lg">
          <div className="text-center p-8">
            <p className="font-semibold">Data Not Available</p>
            <p className="text-sm mt-2">
              The required data series (total employment, recessions, or real wages) is not available in the current dataset.
            </p>
          </div>
        </div>
      </ChartCard>
    );
  }

  const hoveredData = hoveredIndex !== null ? netChange[hoveredIndex] : null;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-3"> {/* Ensure this takes full width */}
        <ChartCard
          title="The Jobs Rollercoaster: Boom, Bust, Recovery"
          subtitle="Monthly net job change since 1939. Shaded areas are recessions."
          aria-label="Chart showing monthly net job changes, with shaded areas indicating periods of recession."
        >
          <div className="h-[400px] relative"> {/* Give a fixed height to the chart container */}
            <NetChangeBarcode
              data={netChange}
              recessions={recessions} // Pass the recessions array
              recoveries={recoveries}
              showRecoveryPaths={showRecoveryPaths}
              onHover={setHoveredIndex}
            />
            {hoveredData && (
              <div className="absolute top-2 left-2 bg-platform-contrast/80 p-2 rounded text-xs pointer-events-none">
                <div>{new Date(hoveredData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</div>
                <div className={hoveredData.value! > 0 ? 'text-green-400' : 'text-red-400'}>
                  {fmtShort(hoveredData.value! * 1000)}
                </div>
              </div>
            )}
          </div>
        </ChartCard>
      </div>
      <ChartCard title="Controls & Stats">
        <div className="space-y-4">
          <p>Median Recovery Time: <strong>{medianMonths?.toFixed(1) ?? 'N/A'} months</strong></p>
          <button
            onClick={() => setShowRecoveryPaths(!showRecoveryPaths)}
            className="text-sm p-2 bg-platform-contrast rounded hover:bg-platform-accent"
          >
            {showRecoveryPaths ? 'Hide' : 'Show'} Recovery Paths
          </button>
        </div>
      </ChartCard>
      <div className="md:col-span-2">
        <ChartCard title="Real Average Hourly Earnings (2024 Dollars)">
          <div className="h-[200px]"> {/* Give a fixed height to the chart container */}
            {realWages.length > 0 ? ( // Only render if realWages has data
              <RealWagePanel series={realWages} />
            ) : (
              <div className="flex items-center justify-center h-full text-platform-text/70">
                No real wage data available.
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}