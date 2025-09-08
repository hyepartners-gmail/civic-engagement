'use client';
import { useMemo, useRef, useEffect } from 'react';
import NarrativeSwitcher from '@/components/ui/NarrativeSwitcher';
import ChartCard from '@/components/charts/ChartCard';
import SectorLegend from '@/components/charts/SectorLegend';
import DownloadButton from '@/components/ui/DownloadButton';
import { useEmploymentData } from '@/hooks/useEmploymentData';
import { useRecessions } from '@/hooks/useRecessions';
import { useUrlState } from '@/hooks/useUrlState';
import { narratives, SECTORS } from '@/lib/employment/narratives';

import StoryOneYear from '@/components/employment/narratives/StoryOneYear';
import StoryBeveridgeCurve from '@/components/employment/narratives/StoryBeveridgeCurve';
import StoryQuittersProsper from '@/components/employment/narratives/StoryQuittersProsper';
import StoryGeographyOfOpportunity from '@/components/employment/narratives/StoryGeographyOfOpportunity';
import StoryWorkAndWallet from '@/components/employment/narratives/StoryWorkAndWallet';
import StoryCenturyOfWork from '@/components/employment/narratives/StoryCenturyOfWork';
import MonthlyNetChangeBarChart from '@/components/employment/narratives/MonthlyNetChangeBarChart';
import StoryBoomBust from '@/components/employment/narratives/StoryBoomBust';
import dynamic from 'next/dynamic';

const SectorStackedArea = dynamic(() => import('@/components/charts/SectorStackedArea'), { ssr: false });

export default function EmploymentClientPage() {
  const { data: artifact, isLoading, isError, error } = useEmploymentData();
  const { data: recessions } = useRecessions();
  const [activeSector, setActiveSector] = useUrlState<string | null>('sector', null);
  const [narrative] = useUrlState<string>('n', narratives[0].id);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (artifact) {
      console.log('[EmploymentClientPage] Artifact loaded successfully with index length:', artifact.index?.length);
      // Dispatch a success event to notify the parent component that data loaded successfully
      const successEvent = new Event('employment-data-success');
      window.dispatchEvent(successEvent);
    }
    // Only dispatch error event if there's actually an error
    if (isError && error) {
      console.log('[EmploymentClientPage] Error state detected with actual error, dispatching employment-data-error event');
      console.error('[EmploymentClientPage] Error loading employment data:', error);
      // Dispatch an event to notify the parent component about the error
      const errorEvent = new Event('employment-data-error');
      window.dispatchEvent(errorEvent);
    } else if (isError) {
      console.log('[EmploymentClientPage] Error state detected but no error object, not dispatching event');
    }
  }, [artifact, isError, error]);

  const { chartSeries, csvData } = useMemo(() => {
    if (!artifact) {
      console.log('[EmploymentClientPage] Memo: Artifact not ready.');
      return { chartSeries: [], csvData: [] };
    }
    console.log('[EmploymentClientPage] Memo: Calculating chart series...');

    const series = SECTORS.map((sector) => {
      // The share keys are pre-calculated in the derived section of the data
      const shareKey = `${sector.id}_share`;
      const underscoreShareKey = sector.id.replace(/\./g, '_') + '_share';
      
      let seriesData = artifact.series[shareKey] || artifact.series[underscoreShareKey];
      
      console.log(`[EmploymentClientPage] Memo: Looking for series for ${sector.name}. Key: ${shareKey}. Found: ${!!seriesData}, Length: ${seriesData?.length || 0}`);

      if (!seriesData || seriesData.length === 0) {
        return { id: sector.name, data: [] };
      }

      return {
        id: sector.name,
        data: artifact.index
          .map((row, j) => ({
            x: new Date(row.date),
            y: seriesData[j],
          }))
          .filter((d): d is { x: Date; y: number } => d.y !== null),
      };
    });
    
    const csv = artifact.index.map((row, i) => {
        const rowData: Record<string, any> = { date: row.date };
        SECTORS.forEach((sector) => {
            const shareKey = `${sector.id}_share`;
            const underscoreShareKey = sector.id.replace(/\./g, '_') + '_share';
            const seriesData = artifact.series[shareKey] || artifact.series[underscoreShareKey];
            rowData[`${sector.name}_share`] = seriesData?.[i] ?? null;
        });
        return rowData;
    });

    console.log('[EmploymentClientPage] Memo: Calculation complete. Chart series count:', series.length);
    return { chartSeries: series, csvData: csv };
  }, [artifact]);

  if (isLoading) return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading employment data...</div>
      </div>
    </div>
  );
  
  if (isError) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-lg text-red-600 font-bold">Error loading employment data</div>
          <div className="text-sm text-gray-600 max-w-lg text-center">
            {error instanceof Error ? error.message : 'An unknown error occurred while loading employment data'}
          </div>
          <p className="text-sm text-gray-600 max-w-lg text-center">
            This could be due to missing or invalid data in the employment datasets. 
            The system filters out invalid data entries but was unable to process the complete dataset.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!artifact) return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">No employment data available</div>
      </div>
    </div>
  );

  const renderNarrative = () => {
    switch (narrative) {
      case 'century-of-work':
        return <StoryCenturyOfWork />;
      case 'one-year':
        return <StoryOneYear />;
      case 'boom-bust':
        return <StoryBoomBust />;
      case 'help-wanted':
        return <StoryBeveridgeCurve />;
      case 'quitters-prosper':
        return <StoryQuittersProsper />;
      case 'geography-of-opportunity':
        return <StoryGeographyOfOpportunity />;
      case 'work-and-wallet':
        return <StoryWorkAndWallet />;
      default:
        return <div>Select a narrative</div>;
    }
  };

  const currentNarrative = narratives.find(n => n.id === narrative) || narratives[0];

  return (
    <main className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Enhanced Header with Better UX */}
      <div className="space-y-6">
        {/* Main Title */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-platform-text">
            Employment — Macro & Cycles
          </h1>
          <p className="text-platform-text/70 text-sm md:text-base max-w-3xl leading-relaxed">
            Explore comprehensive employment data through multiple analytical lenses. 
            Each narrative reveals different aspects of America's labor market dynamics.
          </p>
        </div>
        
        {/* Narrative Switcher */}
        <div className="flex justify-end">
          <NarrativeSwitcher items={narratives.map(n => ({ id: n.id, label: n.label, description: n.desc }))} />
        </div>
        
        {/* Current Narrative Info */}
        <div className="bg-platform-contrast/10 rounded-lg p-6 border border-platform-contrast/20">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-semibold text-platform-accent">
              {currentNarrative.label}
            </h2>
            <p className="text-platform-text/80 text-base md:text-lg leading-relaxed">
              {currentNarrative.desc}
            </p>
          </div>
        </div>
      </div>
      
      {renderNarrative()}
    </main>
  );
}