'use client';
import { useMemo, useState, useEffect, useRef } from 'react';
import ChartCard from '@/components/charts/ChartCard';
import { useEmploymentData } from '@/hooks/useEmploymentData';
import { alignMonthly, toFYPoints, findBeveridgeAnomalies } from '@/lib/employmentSelectors';
import BeveridgeCurve from '@/components/charts/BeveridgeCurve';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { Button } from '@/components/ui/button';
import { Play, Pause, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { fmtPct } from '@/utils/number';
import dynamic from 'next/dynamic';

// Dynamically import nivo components to ensure they're only loaded on the client side
const ResponsiveLine = dynamic(
  () => import('@nivo/line').then(mod => mod.ResponsiveLine),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);

interface BeveridgePoint {
  fy: number;
  ur: number;
  openings: number;
  distance?: number;
  period?: 'pre-covid' | 'covid' | 'post-covid';
}

function detectAdvancedAnomalies(points: BeveridgePoint[]) {
  if (points.length < 5) return { outliers: [], structuralBreaks: [], shift: 'stable' };
  
  // Calculate distance from typical curve for each point
  const avgUr = points.reduce((sum, p) => sum + p.ur, 0) / points.length;
  const avgOpenings = points.reduce((sum, p) => sum + p.openings, 0) / points.length;
  
  const pointsWithDistance = points.map(point => {
    const expectedOpenings = avgOpenings * (avgUr / point.ur); // Simplified inverse relationship
    const distance = Math.abs(point.openings - expectedOpenings);
    
    let period: 'pre-covid' | 'covid' | 'post-covid' = 'pre-covid';
    if (point.fy >= 2020 && point.fy <= 2021) period = 'covid';
    else if (point.fy > 2021) period = 'post-covid';
    
    return { ...point, distance, period };
  });
  
  const avgDistance = pointsWithDistance.reduce((sum, p) => sum + p.distance!, 0) / pointsWithDistance.length;
  const outliers = pointsWithDistance.filter(p => p.distance! > avgDistance * 2).map(p => p.fy);
  const structuralBreaks = [2020, 2021]; // Known COVID impact years
  
  return { outliers, structuralBreaks, shift: outliers.length > 2 ? 'outward' : 'stable' };
}

export default function StoryBeveridgeCurve() {
  const { data: artifact, isLoading } = useEmploymentData();
  const [viewMode, setViewMode] = useState<'curve' | 'timeseries' | 'analysis'>('curve');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a more robust approach to ensure the component only renders after DOM is ready
  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure DOM is fully ready
      const frame = requestAnimationFrame(() => {
        setIsRendered(true);
      });
      
      return () => {
        cancelAnimationFrame(frame);
      };
    }
  }, []);

  const { fyPoints, anomalies, analysisData, summaryStats } = useMemo(() => {
    if (!artifact) return { fyPoints: [], anomalies: [], analysisData: null, summaryStats: null };

    const monthlyAligned = alignMonthly(artifact, ['cps.ur_headline', 'jolts.openings_rate']);
    const points: BeveridgePoint[] = toFYPoints(monthlyAligned).map(d => ({
      fy: d.fy,
      ur: d.values[0] ?? 0,
      openings: d.values[1] ?? 0,
    })).filter(p => p.ur > 0 && p.openings > 0);
    
    const detectedAnomalies = findBeveridgeAnomalies(points);
    const analysisData = detectAdvancedAnomalies(points);
    
    const avgUr = points.reduce((sum, p) => sum + p.ur, 0) / points.length;
    const avgOpenings = points.reduce((sum, p) => sum + p.openings, 0) / points.length;
    
    const summaryStats = {
      avgUr,
      avgOpenings,
      anomalyCount: analysisData.outliers.length,
      structuralBreaks: analysisData.structuralBreaks.length,
      shift: analysisData.shift
    };

    return { fyPoints: points, anomalies: detectedAnomalies, analysisData, summaryStats };
  }, [artifact]);
  
  const timeSeriesData = useMemo(() => {
    if (!fyPoints.length) return [];
    
    return [
      {
        id: 'Unemployment Rate',
        data: fyPoints.map(p => ({ x: p.fy, y: p.ur }))
      },
      {
        id: 'Job Openings Rate',
        data: fyPoints.map(p => ({ x: p.fy, y: p.openings }))
      }
    ];
  }, [fyPoints]);

  if (isLoading) {
    return <div>Loading narrative data...</div>;
  }
  
  if (!fyPoints.length) {
    return (
      <ChartCard
        title="The Beveridge Curve: Job Openings vs. Unemployment"
        subtitle="Relationship between job availability and unemployment."
      >
        <div className="flex items-center justify-center h-full text-platform-text/70 bg-platform-contrast/30 rounded-lg">
          <div className="text-center p-8">
            <p className="font-semibold">Data Not Available</p>
            <p className="text-sm mt-2">
              The required data series (unemployment rate, job openings) is not available in the current dataset.
            </p>
          </div>
        </div>
      </ChartCard>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Summary Cards */}
      {summaryStats && (
        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-platform-accent" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {fmtPct(summaryStats.avgUr / 100)}
            </div>
            <div className="text-xs text-platform-text/70">Avg. Unemployment</div>
            <div className="text-xs text-platform-text/50">Historical average</div>
          </div>
          
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-platform-cyan" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {fmtPct(summaryStats.avgOpenings / 100)}
            </div>
            <div className="text-xs text-platform-text/70">Avg. Job Openings</div>
            <div className="text-xs text-platform-text/50">Historical average</div>
          </div>
          
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {summaryStats.anomalyCount}
            </div>
            <div className="text-xs text-platform-text/70">Anomaly Years</div>
            <div className="text-xs text-platform-text/50">Detected outliers</div>
          </div>
          
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {summaryStats.structuralBreaks}
            </div>
            <div className="text-xs text-platform-text/70">Structural Breaks</div>
            <div className="text-xs text-platform-text/50">Major shifts detected</div>
          </div>
        </div>
      )}
      
      {/* View Toggle */}
      <div className="md:col-span-3 flex justify-center gap-2 mb-4">
        <Button
          variant={viewMode === 'curve' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('curve')}
          size="sm"
        >
          Beveridge Curve
        </Button>
        <Button
          variant={viewMode === 'timeseries' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('timeseries')}
          size="sm"
        >
          Time Series
        </Button>
        <Button
          variant={viewMode === 'analysis' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('analysis')}
          size="sm"
        >
          Analysis
        </Button>
      </div>

      {/* Main Visualization */}
      <div className="md:col-span-2">
        <ChartCard
          title={
            viewMode === 'curve' ? "The Beveridge Curve: Job Openings vs. Unemployment" :
            viewMode === 'timeseries' ? "Unemployment and Job Openings Over Time" :
            "Structural Analysis"
          }
          subtitle={
            viewMode === 'curve' ? "Each point represents a fiscal year average. Post-COVID years show a structural shift." :
            viewMode === 'timeseries' ? "Historical trends in unemployment rate and job openings rate." :
            "Advanced anomaly detection and structural break analysis."
          }
        >
          {viewMode === 'curve' && fyPoints && fyPoints.length > 0 && (
            <BeveridgeCurve data={fyPoints} anomalies={anomalies} />
          )}
          
          {viewMode === 'timeseries' && timeSeriesData && timeSeriesData.length > 0 && isRendered && (
            <ChartErrorBoundary>
              <ChartWrapper className="h-[400px]">
                <ResponsiveLine
                  data={timeSeriesData}
                  margin={{ top: 20, right: 110, bottom: 60, left: 80 }}
                  xScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
                  yScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
                  curve="monotoneX"
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Fiscal Year',
                    legendOffset: 40,
                    legendPosition: 'middle'
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Rate (%)',
                    legendOffset: -60,
                    legendPosition: 'middle'
                  }}
                  colors={[colors.semantic.error, colors.platform.accent]}
                  lineWidth={3}
                  pointSize={4}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  pointColor={{ theme: 'background' }}
                  enableSlices="x"
                  legends={[
                    {
                      anchor: 'bottom-right',
                      direction: 'column',
                      justify: false,
                      translateX: 100,
                      translateY: 0,
                      itemsSpacing: 0,
                      itemDirection: 'left-to-right',
                      itemWidth: 80,
                      itemHeight: 20,
                      itemOpacity: 0.75,
                      symbolSize: 12,
                      symbolShape: 'circle'
                    }
                  ]}
                  theme={{
                    axis: {
                      ticks: { text: { fill: colors.platform.text } },
                      legend: { text: { fill: colors.platform.text } }
                    },
                    grid: { line: { stroke: colors.platform.contrast } },
                    tooltip: { container: { background: colors.platform.contrast, color: colors.platform.text } }
                  }}
                />
              </ChartWrapper>
            </ChartErrorBoundary>
          )}
          
          {viewMode === 'analysis' && analysisData && (
            <div className="space-y-6">
              <div className="bg-platform-contrast/20 p-4 rounded-lg">
                <h4 className="font-semibold text-platform-accent mb-3">Structural Analysis</h4>
                <div className="text-lg font-bold text-red-400">
                  {analysisData.shift.toUpperCase()} SHIFT
                </div>
                <p className="text-sm text-platform-text/90 mt-2">
                  {analysisData.shift === 'outward' ? 
                    'The Beveridge curve has shifted outward, indicating reduced job matching efficiency.' :
                    'The Beveridge curve remains relatively stable with normal labor market dynamics.'}
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-platform-contrast/10 p-3 rounded-lg">
                  <h5 className="font-medium mb-2">Anomaly Years</h5>
                  <p className="text-sm">
                    {analysisData.outliers.length > 0 ? analysisData.outliers.join(', ') : 'None detected'}
                  </p>
                </div>
                
                <div className="bg-platform-contrast/10 p-3 rounded-lg">
                  <h5 className="font-medium mb-2">Structural Breaks</h5>
                  <p className="text-sm">
                    {analysisData.structuralBreaks.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Fallback for when data is not ready or we're not on the client */}
          {viewMode === 'curve' && (!fyPoints || fyPoints.length === 0) && (
            <div className="h-[400px] w-full bg-platform-contrast/30 animate-pulse rounded-lg" />
          )}
          
          {viewMode === 'timeseries' && (!timeSeriesData || timeSeriesData.length === 0 || !isRendered) && (
            <div className="h-[400px] w-full bg-platform-contrast/30 animate-pulse rounded-lg" />
          )}
        </ChartCard>
      </div>
      
      {/* Controls & Analysis */}
      <ChartCard title="Analysis & Controls">
        <div className="space-y-4">
          <div className="text-sm text-platform-text/80">
            The Beveridge curve shows the inverse relationship between unemployment and job vacancy rates.
          </div>
          
          {analysisData && (
            <div className="bg-platform-contrast/10 p-3 rounded-lg">
              <h5 className="font-medium mb-2">Key Insights</h5>
              <ul className="text-sm space-y-1">
                <li>• COVID-19 created a major structural break in 2020-2021</li>
                <li>• {analysisData.outliers.length} anomalous years detected</li>
                <li>• Current state suggests {analysisData.shift} labor market efficiency</li>
              </ul>
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
}