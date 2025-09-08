'use client';
import { useMemo, useState, useRef } from 'react';
import ChartCard from '@/components/charts/ChartCard';
import SectorLegend from '@/components/charts/SectorLegend';
import DownloadButton from '@/components/ui/DownloadButton';
import { useEmploymentData } from '@/hooks/useEmploymentData';
import { useRecessions } from '@/hooks/useRecessions';
import { SECTORS } from '@/lib/employment/narratives';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, BarChart, PieChart, Factory } from 'lucide-react';
import { fmtPct, fmtShort } from '@/utils/number';
import MonthlyNetChangeBarChart from './MonthlyNetChangeBarChart';
// Removed: import YearlyNetChangeBarChart from './YearlyNetChangeBarChart'; // Removed this import
import dynamic from 'next/dynamic';

const SectorStackedArea = dynamic(
  () => {
    return import('@/components/charts/SectorStackedArea').catch(error => {
      console.error('Error loading SectorStackedArea component:', error);
      // Return a fallback component
      return { default: () => (
        <div className="h-full w-full flex items-center justify-center bg-platform-contrast/30 rounded-lg">
          <div className="text-center p-4">
            <p className="text-platform-text/70 font-semibold">Component Load Error</p>
            <p className="text-platform-text/50 text-sm mt-1">Unable to load chart component</p>
          </div>
        </div>
      )};
    });
  }, 
  { 
    ssr: false,
    loading: () => {
      return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
    }
  }
);

interface SectorTrend {
  sector: string;
  startShare: number;
  endShare: number;
  change: number;
  trend: 'growth' | 'decline' | 'stable';
  volatility: number;
}

interface SectorAnalysis {
  trends: SectorTrend[];
  winners: string[];
  losers: string[];
  mostVolatile: string[];
  economicShifts: {
    period: string;
    description: string;
    affectedSectors: string[];
  }[];
}

// Error boundary component for charts
function ChartErrorBoundary({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return fallback || (
      <div className="h-full w-full flex items-center justify-center bg-platform-contrast/30 rounded-lg">
        <div className="text-center p-4">
          <p className="text-platform-text/70 font-semibold">Chart Error</p>
          <p className="text-platform-text/50 text-sm mt-1">Unable to render chart data</p>
        </div>
      </div>
    );
  }

  return (
    <div onError={() => setHasError(true)}>
      {children}
    </div>
  );
}

// Helper function to validate data points
function isValidDataPoint(data: { x: Date; y: number } | null): data is { x: Date; y: number } {
  if (data === null) {
    return false;
  }
  if (data.y === null || data.y === undefined || isNaN(data.y)) {
    return false;
  }
  if (data.y < 0) {
    return false;
  }
  if (!(data.x instanceof Date)) {
    return false;
  }
  if (isNaN(data.x.getTime())) {
    return false;
  }
  return true;
}

function calculateSectorAnalysis(artifact: any, sectors: typeof SECTORS): SectorAnalysis {
  const trends: SectorTrend[] = [];
  
  sectors.forEach(sector => {
    // First, try to find derived share data (which is already in ratio format)
    let seriesDataObj = artifact.derived?.[`${sector.id}_share`] || 
                       artifact.derived?.[sector.id.replace(/\./g, '_') + '_share'] ||
                       artifact.series[`${sector.id}_share`] || 
                       artifact.series[sector.id.replace(/\./g, '_') + '_share'];
    
    // If not found, try to find the direct series data
    if (!seriesDataObj || (!seriesDataObj.fy && !seriesDataObj.monthly)) {
      seriesDataObj = artifact.series[sector.id] || artifact.series[sector.id.replace(/\./g, '_')];
    }
    
    // If still not found, try with _share suffix on direct series
    if (!seriesDataObj || (!seriesDataObj.fy && !seriesDataObj.monthly)) {
      const shareKey = `${sector.id}_share`;
      const underscoreShareKey = sector.id.replace(/\./g, '_') + '_share';
      seriesDataObj = artifact.series[shareKey] || artifact.series[underscoreShareKey];
    }
    
    if (!seriesDataObj || (!seriesDataObj.fy && !seriesDataObj.monthly)) return;
    
    // Extract the data array (fy first, then monthly)
    const dataArray = seriesDataObj.fy || seriesDataObj.monthly || [];
    const seriesData = dataArray.map(([date, value]: [string, number]) => value);
    
    const validData = seriesData.filter((v: number | null): v is number => v !== null);
    if (validData.length < 2) return;
    
    const startShare = validData[0];
    const endShare = validData[validData.length - 1];
    const change = endShare - startShare;
    
    // Calculate volatility (standard deviation)
    const mean = validData.reduce((sum: number, v: number) => sum + v, 0) / validData.length;
    const variance = validData.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / validData.length;
    const volatility = Math.sqrt(variance);
    
    trends.push({
      sector: sector.name,
      startShare,
      endShare,
      change,
      trend: Math.abs(change) > 0.01 ? (change > 0 ? 'growth' : 'decline') : 'stable',
      volatility
    });
  });
  
  // Sort by change for winners/losers
  const sortedByChange = [...trends].sort((a, b) => b.change - a.change);
  const winners = sortedByChange.slice(0, 2).map(t => t.sector);
  const losers = sortedByChange.slice(-2).map(t => t.sector);
  
  // Sort by volatility
  const sortedByVolatility = [...trends].sort((a, b) => b.volatility - a.volatility);
  const mostVolatile = sortedByVolatility.slice(0, 2).map(t => t.sector);
  
  // Economic shifts (simplified analysis)
  const economicShifts = [
    {
      period: '1980s-1990s',
      description: 'Manufacturing decline, services growth',
      affectedSectors: ['Manufacturing', 'Education & Health']
    },
    {
      period: '2000s',
      description: 'Technology boom and housing bubble',
      affectedSectors: ['Construction', 'Leisure & Hospitality']
    },
    {
      period: '2020s',
      description: 'COVID-19 pandemic impact',
      affectedSectors: ['Leisure & Hospitality', 'Government']
    }
  ];
  
  return { trends, winners, losers, mostVolatile, economicShifts };
}

function SectorTrendsTable({ trends }: { trends: SectorTrend[] }) {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'growth': return 'text-green-400';
      case 'decline': return 'text-red-400';
      default: return 'text-platform-text';
    }
  };
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growth': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'decline': return <TrendingDown className="h-4 w-4 text-red-400" />;
      default: return <div className="h-4 w-4" />;
    }
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-platform-contrast">
            <th className="text-left p-2">Sector</th>
            <th className="text-right p-2">Start %</th>
            <th className="text-right p-2">Current %</th>
            <th className="text-right p-2">Change</th>
            <th className="text-center p-2">Trend</th>
          </tr>
        </thead>
        <tbody>
          {trends.map((trend, i) => (
            <tr key={i} className="border-b border-platform-contrast/30">
              <td className="p-2 font-medium">{trend.sector}</td>
              <td className="p-2 text-right">{fmtPct(trend.startShare)}</td>
              <td className="p-2 text-right">{fmtPct(trend.endShare)}</td>
              <td className={`p-2 text-right ${getTrendColor(trend.trend)}`}>
                {trend.change > 0 ? '+' : ''}{fmtPct(trend.change)}
              </td>
              <td className="p-2 text-center">
                {getTrendIcon(trend.trend)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EconomicShiftsTimeline({ shifts }: { shifts: SectorAnalysis['economicShifts'] }) {
  return (
    <div className="space-y-4">
      {shifts.map((shift, i) => (
        <div key={i} className="bg-platform-contrast/10 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Factory className="h-4 w-4 text-platform-accent" />
            <h4 className="font-semibold text-platform-accent">{shift.period}</h4>
          </div>
          <p className="text-sm text-platform-text/90 mb-2">{shift.description}</p>
          <div className="flex flex-wrap gap-1">
            {shift.affectedSectors.map((sector, j) => (
              <span key={j} className="text-xs bg-platform-accent/20 text-platform-accent px-2 py-1 rounded">
                {sector}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StoryCenturyOfWork() {
  const { data: artifact, isLoading, error } = useEmploymentData();
  const { data: recessions } = useRecessions();
  const [viewMode, setViewMode] = useState<'overview' | 'trends' | 'analysis'>('overview');
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Filter out 'Total Private' from the sectors to display as it's not needed in a stacked chart
  const sectorsToDisplay = SECTORS.filter(sector => sector.name !== 'Total Private');
  
  const { chartSeries, csvData, sectorAnalysis } = useMemo(() => {
    if (!artifact) {
      return { chartSeries: [], csvData: [], sectorAnalysis: null };
    }

    try {
      console.log('Artifact structure keys:', Object.keys(artifact));
      console.log('Series keys available:', Object.keys(artifact.series || {}));
      console.log('Derived keys available:', Object.keys(artifact.derived || {}));
      
      const series = sectorsToDisplay.map((sector) => {
        // First, try to find derived share data (which is already in ratio format)
        let seriesDataObj = artifact.derived?.[`${sector.id}_share`] || 
                           artifact.derived?.[sector.id.replace(/\./g, '_') + '_share'] ||
                           artifact.series[`${sector.id}_share`] || 
                           artifact.series[sector.id.replace(/\./g, '_') + '_share'];
        
        // If not found, try to find the direct series data
        if (!seriesDataObj || (!seriesDataObj.fy && !seriesDataObj.monthly)) {
          seriesDataObj = artifact.series[sector.id] || artifact.series[sector.id.replace(/\./g, '_')];
        }
        
        // If still not found, try with _share suffix on direct series
        if (!seriesDataObj || (!seriesDataObj.fy && !seriesDataObj.monthly)) {
          const shareKey = `${sector.id}_share`;
          const underscoreShareKey = sector.id.replace(/\./g, '_') + '_share';
          seriesDataObj = artifact.series[shareKey] || artifact.series[underscoreShareKey];
        }
        
        if (!seriesDataObj || (!seriesDataObj.fy && !seriesDataObj.monthly)) {
          console.log(`No data found for sector ${sector.name} under any key variation`);
          return { id: sector.name, data: [] };
        }

        // Only use fiscal year data since monthly data has been removed
        const dataArray = seriesDataObj.fy || [];
        console.log(`Data source for ${sector.name}: ${seriesDataObj.fy ? 'fiscal year data' : 'no fiscal year data found'}`);
        
        // Log only summary instead of every data point
        console.log(`Processing data for ${sector.name} - ${dataArray.length} points available`);
        if (dataArray.length > 0) {
          console.log(`First data point: ${dataArray[0][0]}, ${dataArray[0][1]}`);
          console.log(`Last data point: ${dataArray[dataArray.length-1][0]}, ${dataArray[dataArray.length-1][1]}`);
        }

        // Transform the data to the format expected by the chart
        const validData = dataArray
          .map(([dateStr, value]: [string, number], j: number) => {
            // Only log issues, not every data point
            if (value === null || value === undefined || isNaN(value)) {
              console.log(`Skipping ${sector.name} at index ${j}: invalid value ${value}`);
              return null;
            }
            
            try {
              let dateObj;
              // Handle FY format (e.g., "FY1939")
              if (typeof dateStr === 'string' && dateStr.startsWith('FY')) {
                const year = parseInt(dateStr.substring(2));
                // Use July 1st as the start of the fiscal year (common for US federal government)
                dateObj = new Date(year, 6, 1); // July 1st
              } else {
                // Try to parse as a regular date
                dateObj = new Date(dateStr);
              }
              
              if (isNaN(dateObj.getTime())) {
                console.warn(`Invalid date for ${sector.name} at index ${j}: ${dateStr}`);
                return null;
              }
              
              return {
                x: dateObj,
                y: value,
              };
            } catch (err) {
              console.error(`Error creating date for ${sector.name} at index ${j}:`, err);
              return null;
            }
          })
          .filter((data: { x: Date; y: number } | null, idx: number) => {
            const isValid = isValidDataPoint(data);
            if (!isValid && data) {
              console.log(`Filtering out invalid data point from ${sector.name}`);
            }
            return isValid;
          });

        console.log(`Final data for ${sector.name}: ${validData.length} valid points`);
        return {
          id: sector.name,
          data: validData,
        };
      });
      
      const csv = artifact.index.map((row: any, i: number) => {
          const rowData: Record<string, any> = { date: row.date };
          sectorsToDisplay.forEach((sector) => {
              // Try all possible key variations for CSV export
              const directKey = sector.id;
              const underscoreKey = sector.id.replace(/\./g, '_');
              const shareKey = `${sector.id}_share`;
              const underscoreShareKey = sector.id.replace(/\./g, '_') + '_share';
              
              // Try all possible key formats (derived first, then series)
              let seriesDataObj = 
                artifact.derived?.[shareKey] || 
                artifact.derived?.[underscoreShareKey] ||
                artifact.series[shareKey] || 
                artifact.series[underscoreShareKey] ||
                artifact.series[directKey] || 
                artifact.series[underscoreKey];
              
              // Extract the value from the fiscal year array only
              let value = null;
              if (seriesDataObj) {
                const dataArray = seriesDataObj.fy || [];
                if (i < dataArray.length) {
                  value = dataArray[i][1]; // [date, value] format
                }
              }
              
              rowData[`${sector.name}_share`] = value;
          });
          return rowData;
      });
      
      const sectorAnalysis = calculateSectorAnalysis(artifact, sectorsToDisplay);

      return { chartSeries: series, csvData: csv, sectorAnalysis };
    } catch (err) {
      console.error('Error processing sector data:', err);
      return { chartSeries: [], csvData: [], sectorAnalysis: null };
    }
  }, [artifact, sectorsToDisplay]);
  
  const summaryStats = useMemo(() => {
    if (!sectorAnalysis) return null;
    
    const totalChange = sectorAnalysis.trends.reduce((sum, t) => sum + Math.abs(t.change), 0);
    const avgVolatility = sectorAnalysis.trends.reduce((sum, t) => sum + t.volatility, 0) / sectorAnalysis.trends.length;
    
    return {
      totalStructuralChange: totalChange,
      avgVolatility,
      sectorsInGrowth: sectorAnalysis.trends.filter(t => t.trend === 'growth').length,
      sectorsInDecline: sectorAnalysis.trends.filter(t => t.trend === 'decline').length
    };
  }, [sectorAnalysis]);

  if (isLoading) {
    return <div>Loading employment sector data...</div>;
  }
  
  if (error) {
    return (
      <div className="grid gap-6">
        <ChartCard
          title="A Century of Work"
          subtitle="Employment sector evolution analysis."
        >
          <div className="flex items-center justify-center h-full text-platform-text/70 bg-platform-contrast/30 rounded-lg">
            <div className="text-center p-4">
              <p className="font-semibold text-red-500">Data Loading Error</p>
              <p className="text-sm mt-2">
                There was an error loading the employment data.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs mt-2 text-red-400">{error.message}</p>
              )}
            </div>
          </div>
        </ChartCard>
      </div>
    );
  }
  
  if (!artifact || !sectorAnalysis) {
    return (
      <div className="grid gap-6">
        <ChartCard
          title="A Century of Work"
          subtitle="Employment sector evolution analysis."
        >
          <div className="flex items-center justify-center h-full text-platform-text/70 bg-platform-contrast/30 rounded-lg">
            <div className="text-center p-8">
              <p className="font-semibold">Data Not Available</p>
              <p className="text-sm mt-2">
                Sector employment data is not available in the current dataset.
              </p>
            </div>
          </div>
        </ChartCard>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart className="h-5 w-5 text-platform-accent" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {fmtPct(summaryStats.totalStructuralChange)}
            </div>
            <div className="text-xs text-platform-text/70">Total Structural Change</div>
            <div className="text-xs text-platform-text/50">Cumulative sector shifts</div>
          </div>
          
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {summaryStats.sectorsInGrowth}
            </div>
            <div className="text-xs text-platform-text/70">Growing Sectors</div>
            <div className="text-xs text-platform-text/50">Expanding share</div>
          </div>
          
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {summaryStats.sectorsInDecline}
            </div>
            <div className="text-xs text-platform-text/70">Declining Sectors</div>
            <div className="text-xs text-platform-text/50">Shrinking share</div>
          </div>
          
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <PieChart className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {(summaryStats.avgVolatility * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-platform-text/70">Avg. Volatility</div>
            <div className="text-xs text-platform-text/50">Sector variability</div>
          </div>
        </div>
      )}
      
      {/* View Toggle */}
      <div className="flex justify-center gap-2 mb-4">
        <Button
          variant={viewMode === 'overview' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('overview')}
          size="sm"
        >
          Overview
        </Button>
        <Button
          variant={viewMode === 'trends' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('trends')}
          size="sm"
        >
          Sector Trends
        </Button>
        <Button
          variant={viewMode === 'analysis' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('analysis')}
          size="sm"
        >
          Economic Shifts
        </Button>
      </div>

      {/* Main Content */}
      {viewMode === 'overview' && (
        <>
          <div ref={chartRef}>
            <ChartCard
              title="Sector Shares Over Time"
              subtitle="Share of total nonfarm employment. Shaded areas indicate recessions."
              footer={
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <SectorLegend sectors={sectorsToDisplay} activeSector={activeSector} onSectorChange={setActiveSector} />
                  <DownloadButton chartRef={chartRef} csvData={csvData} filename="sector_shares" />
                </div>
              }
            >
              <div className="h-[700px] w-full bg-platform-contrast/5 overflow-hidden relative">
                {chartSeries.some(s => s.data.length > 0) ? (
                  <ChartErrorBoundary fallback={
                    <div className="h-full w-full flex items-center justify-center bg-platform-contrast/30 rounded-lg">
                      <div className="text-center p-4">
                        <p className="text-platform-text/70 font-semibold">Chart Error</p>
                        <p className="text-platform-text/50 text-sm mt-1">Unable to render employment sector data</p>
                      </div>
                    </div>
                  }>
                    <SectorStackedArea 
                      series={chartSeries} 
                      recessions={recessions || []} 
                      activeSector={activeSector}
                    />
                  </ChartErrorBoundary>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-center p-4">
                      <p className="text-platform-text/70">No data available</p>
                      <p className="text-xs text-platform-text/50 mt-1">Series found but data is empty</p>
                    </div>
                  </div>
                )}
              </div>
            </ChartCard>
          </div>
          
          {/* Removed the YearlyNetChangeBarChart card */}
        </>
      )}
      
      {viewMode === 'trends' && (
        <div className="grid gap-6 md:grid-cols-2">
          <ChartCard title="Sector Performance Analysis">
            <SectorTrendsTable trends={sectorAnalysis.trends} />
          </ChartCard>
          
          <div className="space-y-6">
            <ChartCard title="Winners & Losers">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">Top Gainers</h4>
                  <ul className="space-y-1">
                    {sectorAnalysis.winners.map((sector, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        {sector}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">Biggest Declines</h4>
                  <ul className="space-y-1">
                    {sectorAnalysis.losers.map((sector, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                        {sector}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ChartCard>
            
            <ChartCard title="Most Volatile Sectors">
              <div className="space-y-2">
                {sectorAnalysis.mostVolatile.map((sector, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <BarChart className="h-4 w-4 text-yellow-400" />
                    {sector}
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </div>
      )}
      
      {viewMode === 'analysis' && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <ChartCard 
              title="Economic Shifts Timeline"
              subtitle="Major economic transitions and their impact on employment sectors."
            >
              <EconomicShiftsTimeline shifts={sectorAnalysis.economicShifts} />
            </ChartCard>
          </div>
          
          <ChartCard title="Key Insights">
            <div className="space-y-4">
              <div className="bg-platform-contrast/10 p-3 rounded-lg">
                <h5 className="font-medium mb-2 text-platform-accent">Structural Changes</h5>
                <ul className="text-sm space-y-1">
                  <li>• Manufacturing's decline reflects deindustrialization</li>
                  <li>• Service sectors have grown consistently</li>
                  <li>• Government employment varies with fiscal policy</li>
                </ul>
              </div>
              
              <div className="bg-platform-contrast/10 p-3 rounded-lg">
                <h5 className="font-medium mb-2 text-platform-accent">Recent Trends</h5>
                <ul className="text-sm space-y-1">
                  <li>• COVID-19 disrupted leisure & hospitality</li>
                  <li>• Healthcare continues expanding</li>
                  <li>• Construction remains cyclical</li>
                </ul>
              </div>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}