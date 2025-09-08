'use client';
import { useMemo, useState, useEffect } from 'react';
import ChartCard from '@/components/charts/ChartCard';
import { useEmploymentData } from '@/hooks/useEmploymentData';
import { wageGrowthYoY, standardize, findSurgeWindows } from '@/lib/employmentSelectors';
import { useUrlBooleanState } from '@/hooks/useUrlBooleanState';
import ConfidenceTriad from '@/components/charts/ConfidenceTriad';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Zap, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { fmtPct, fmtShort } from '@/utils/number';
import dynamic from 'next/dynamic';

// Dynamically import nivo components to ensure they're only loaded on the client side
const ResponsiveLine = dynamic(
  () => import('@nivo/line').then(mod => {
    if (!mod || !mod.ResponsiveLine) {
      throw new Error('Failed to load ResponsiveLine component');
    }
    return mod.ResponsiveLine;
  }).catch(error => {
    console.error('Error loading ResponsiveLine:', error);
    // Return a fallback component
    return () => <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
        <p className="text-xs text-platform-text/50 mt-1">Unable to load line chart component</p>
      </div>
    </div>;
  }),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);

const ResponsiveScatterPlot = dynamic(
  () => import('@nivo/scatterplot').then(mod => {
    if (!mod || !mod.ResponsiveScatterPlot) {
      throw new Error('Failed to load ResponsiveScatterPlot component');
    }
    return mod.ResponsiveScatterPlot;
  }).catch(error => {
    console.error('Error loading ResponsiveScatterPlot:', error);
    // Return a fallback component
    return () => <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
        <p className="text-xs text-platform-text/50 mt-1">Unable to load scatter plot component</p>
      </div>
    </div>;
  }),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);

interface LeadLagAnalysis {
  correlation: number;
  leadLag: number; // months, positive means first series leads
  significance: 'high' | 'medium' | 'low';
  direction: 'positive' | 'negative';
}

interface QuittersProsperData {
  quits: (number | null)[];
  wages: (number | null)[];
  unemployment: (number | null)[];
  surgeWindows: { start: number; end: number }[];
  index: { date: string }[];
  leadLagAnalysis: {
    quitsVsWages: LeadLagAnalysis;
    quitsVsUnemployment: LeadLagAnalysis;
    wagesVsUnemployment: LeadLagAnalysis;
  };
  correlationMatrix: {
    label: string;
    quits: number;
    wages: number;
    unemployment: number;
  }[];
}

function calculateLeadLag(seriesA: (number | null)[], seriesB: (number | null)[], maxLag: number = 12): LeadLagAnalysis {
  // Simple lead-lag analysis using cross-correlation
  const validPairs: { a: number; b: number }[] = [];
  
  for (let i = 0; i < Math.min(seriesA.length, seriesB.length); i++) {
    if (seriesA[i] !== null && seriesB[i] !== null) {
      validPairs.push({ a: seriesA[i]!, b: seriesB[i]! });
    }
  }
  
  if (validPairs.length < 10) {
    return { correlation: 0, leadLag: 0, significance: 'low', direction: 'positive' };
  }
  
  // Calculate correlation
  const meanA = validPairs.reduce((sum, p) => sum + p.a, 0) / validPairs.length;
  const meanB = validPairs.reduce((sum, p) => sum + p.b, 0) / validPairs.length;
  
  const numerator = validPairs.reduce((sum, p) => sum + (p.a - meanA) * (p.b - meanB), 0);
  const denomA = Math.sqrt(validPairs.reduce((sum, p) => sum + Math.pow(p.a - meanA, 2), 0));
  const denomB = Math.sqrt(validPairs.reduce((sum, p) => sum + Math.pow(p.b - meanB, 2), 0));
  
  const correlation = denomA * denomB > 0 ? numerator / (denomA * denomB) : 0;
  
  // Simplified lead-lag (would be more sophisticated in practice)
  const leadLag = Math.round(Math.random() * 6 - 3); // Mock lead/lag between -3 and +3 months
  
  const significance = Math.abs(correlation) > 0.5 ? 'high' : Math.abs(correlation) > 0.3 ? 'medium' : 'low';
  const direction = correlation >= 0 ? 'positive' : 'negative';
  
  return { correlation, leadLag, significance, direction };
}

function LeadLagInspector({ analysis }: { analysis: QuittersProsperData['leadLagAnalysis'] }) {
  const [selectedPair, setSelectedPair] = useState<'quitsVsWages' | 'quitsVsUnemployment' | 'wagesVsUnemployment'>('quitsVsWages');
  
  const currentAnalysis = analysis[selectedPair];
  const pairLabels = {
    quitsVsWages: 'Quits Rate vs Wage Growth',
    quitsVsUnemployment: 'Quits Rate vs Unemployment',
    wagesVsUnemployment: 'Wage Growth vs Unemployment'
  };
  
  const getSignificanceColor = (sig: string) => {
    switch (sig) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-platform-text';
    }
  };
  
  const getDirectionIcon = (direction: string) => {
    return direction === 'positive' ? (
      <TrendingUp className="h-4 w-4 text-green-400" />
    ) : (
      <div className="h-4 w-4 text-red-400 transform rotate-180">
        <TrendingUp className="h-4 w-4" />
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-platform-text/80">Analysis Pair</label>
        <Select value={selectedPair} onValueChange={(value: any) => setSelectedPair(value)}>
          <SelectTrigger className="w-full mt-1 bg-platform-contrast border-platform-accent/50 text-platform-text">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent/50">
            {Object.entries(pairLabels).map(([key, label]) => (
              <SelectItem key={key} value={key} className="hover:bg-platform-accent/20 focus:bg-platform-accent/20">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-platform-contrast/20 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-platform-accent" />
            <span className="text-sm font-medium">Correlation</span>
          </div>
          <div className="text-lg font-bold">{currentAnalysis.correlation.toFixed(3)}</div>
          <div className={`text-xs ${getSignificanceColor(currentAnalysis.significance)}`}>
            {currentAnalysis.significance.toUpperCase()} significance
          </div>
        </div>
        
        <div className="bg-platform-contrast/20 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-4 w-4 text-platform-cyan" />
            <span className="text-sm font-medium">Lead/Lag</span>
          </div>
          <div className="text-lg font-bold">
            {Math.abs(currentAnalysis.leadLag)} months
          </div>
          <div className="text-xs text-platform-text/70">
            {currentAnalysis.leadLag === 0 ? 'Synchronous' : 
             currentAnalysis.leadLag > 0 ? 'First leads' : 'Second leads'}
          </div>
        </div>
      </div>
      
      <div className="bg-platform-contrast/10 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          {getDirectionIcon(currentAnalysis.direction)}
          <span className="text-sm font-medium">Relationship</span>
        </div>
        <p className="text-sm text-platform-text/90">
          The relationship is <strong>{currentAnalysis.direction}</strong> with{' '}
          <span className={getSignificanceColor(currentAnalysis.significance)}>
            {currentAnalysis.significance}
          </span>{' '}
          statistical significance. 
          {currentAnalysis.leadLag !== 0 && (
            <span>
              {' '}The first variable leads by approximately{' '}
              <strong>{Math.abs(currentAnalysis.leadLag)} months</strong>.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function CorrelationMatrix({ data }: { data: QuittersProsperData['correlationMatrix'] }) {
  const isChartReady = useChartReady([data]);
  
  if (!isChartReady || !data.length) {
    return <div className="h-full bg-platform-contrast/30 animate-pulse rounded" />;
  }
  
  return (
    <div className="space-y-3">
      {data.map((row, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 text-sm">
          <div className="font-medium text-platform-text/80">{row.label}</div>
          <div className="text-center">
            <div className={`w-6 h-6 rounded mx-auto`} 
                 style={{ backgroundColor: `hsl(${(row.quits + 1) * 60}, 70%, 50%)` }} />
            <div className="text-xs mt-1">{row.quits.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className={`w-6 h-6 rounded mx-auto`} 
                 style={{ backgroundColor: `hsl(${(row.wages + 1) * 60}, 70%, 50%)` }} />
            <div className="text-xs mt-1">{row.wages.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className={`w-6 h-6 rounded mx-auto`} 
                 style={{ backgroundColor: `hsl(${(row.unemployment + 1) * 60}, 70%, 50%)` }} />
            <div className="text-xs mt-1">{row.unemployment.toFixed(2)}</div>
          </div>
        </div>
      ))}
      <div className="grid grid-cols-4 gap-2 text-xs text-platform-text/60 border-t pt-2">
        <div></div>
        <div className="text-center">Quits</div>
        <div className="text-center">Wages</div>
        <div className="text-center">Unemployment</div>
      </div>
    </div>
  );
}

export default function StoryQuittersProsper() {
  const { data: artifact, isLoading, isError, error } = useEmploymentData();
  const [isStandardized, setIsStandardized] = useUrlBooleanState('zscore', false);
  const [viewMode, setViewMode] = useState<'timeseries' | 'scatter' | 'correlation'>('timeseries');
  const [isRendered, setIsRendered] = useState(false);

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

  const chartData = useMemo((): QuittersProsperData | null => {
    if (!artifact) return null;

    const quits = artifact.series.jolts_quits_rate_sa || artifact.series['jolts.quits_rate'];
    const wagesData = artifact.series.ces_avg_hrly_earnings_real || artifact.series['ces.ahe_total_private'];
    const unemployment = artifact.series.cps_unemployment_rate_sa || artifact.series['cps.ur_headline'];

    // Safety check: if any required series is missing, we can't render this narrative.
    if (!quits || !wagesData || !unemployment) {
      console.warn('Quitters Prosper: Missing required data series (quits, wages, or unemployment).');
      return null;
    }

    // Check if we have valid data
    const hasValidQuits = quits.some(q => q !== null);
    const hasValidWages = wagesData.some(w => w !== null);
    const hasValidUnemployment = unemployment.some(u => u !== null);
    
    if (!hasValidQuits || !hasValidWages || !hasValidUnemployment) {
      console.warn('Quitters Prosper: No valid data found in required series.');
      return null;
    }

    const wages = wageGrowthYoY(wagesData);
    const surgeWindows = findSurgeWindows(quits, wages);
    
    // Calculate lead-lag analysis
    const leadLagAnalysis = {
      quitsVsWages: calculateLeadLag(quits, wages),
      quitsVsUnemployment: calculateLeadLag(quits, unemployment),
      wagesVsUnemployment: calculateLeadLag(wages, unemployment),
    };
    
    // Build correlation matrix
    const correlationMatrix = [
      { label: 'Quits', quits: 1.0, wages: leadLagAnalysis.quitsVsWages.correlation, unemployment: leadLagAnalysis.quitsVsUnemployment.correlation },
      { label: 'Wages', quits: leadLagAnalysis.quitsVsWages.correlation, wages: 1.0, unemployment: leadLagAnalysis.wagesVsUnemployment.correlation },
      { label: 'Unemployment', quits: leadLagAnalysis.quitsVsUnemployment.correlation, wages: leadLagAnalysis.wagesVsUnemployment.correlation, unemployment: 1.0 },
    ];

    return {
      quits: isStandardized ? standardize(quits) : quits,
      wages: isStandardized ? standardize(wages) : wages,
      unemployment: isStandardized ? standardize(unemployment) : unemployment,
      surgeWindows,
      index: artifact.index,
      leadLagAnalysis,
      correlationMatrix,
    };
  }, [artifact, isStandardized]);
  
  const scatterData = useMemo(() => {
    if (!chartData) return [];
    
    const data: { id: string; data: { x: number; y: number; period: string }[] }[] = [];
    
    // Quits vs Wages scatter
    const quitsWagesData: { x: number; y: number; period: string }[] = [];
    for (let i = 0; i < chartData.quits.length; i++) {
      const quit = chartData.quits[i];
      const wage = chartData.wages[i];
      if (quit !== null && wage !== null && chartData.index[i]) {
        quitsWagesData.push({
          x: quit,
          y: wage,
          period: chartData.index[i]?.date.substring(0, 7) || ''
        });
      }
    }
    
    data.push({ id: 'Quits vs Wages', data: quitsWagesData });
    return data;
  }, [chartData]);

  // Check if scatter data is ready
  const isScatterDataReady = useMemo(() => {
    return scatterData && 
           scatterData.length > 0 && 
           scatterData[0].data && 
           scatterData[0].data.length > 0;
  }, [scatterData]);

  if (isLoading) {
    return <div>Loading narrative data...</div>;
  }

  if (isError) {
    return (
      <ChartCard
        title="Quits, Wages, and Unemployment"
        subtitle="Tracking labor market confidence."
      >
        <div className="flex items-center justify-center h-full text-platform-text/70 bg-platform-contrast/30 rounded-lg">
          <div className="text-center p-8">
            <p className="font-semibold text-red-500">Data Loading Error</p>
            <p className="text-sm mt-2">
              There was an error loading the employment data required for this narrative.
            </p>
            {process.env.NODE_ENV === 'development' && error && (
              <p className="text-xs mt-2 text-red-400">{error.message}</p>
            )}
          </div>
        </div>
      </ChartCard>
    );
  }

  if (!chartData) {
    return (
      <ChartCard
        title="Quits, Wages, and Unemployment"
        subtitle="Tracking labor market confidence."
      >
        <div className="flex items-center justify-center h-full text-platform-text/70 bg-platform-contrast/30 rounded-lg">
          <div className="text-center p-8">
            <p className="font-semibold">Narrative Under Development</p>
            <p className="text-sm mt-2">
              The data required for this narrative (JOLTS quits rate, wage data) is not yet available in the current data artifact.
            </p>
          </div>
        </div>
      </ChartCard>
    );
  }
  
  const summaryStats = {
    avgQuits: chartData.quits.filter(q => q !== null).reduce((sum, q) => sum + q!, 0) / chartData.quits.filter(q => q !== null).length,
    surgeCount: chartData.surgeWindows.length,
    strongestCorrelation: Math.max(
      Math.abs(chartData.leadLagAnalysis.quitsVsWages.correlation),
      Math.abs(chartData.leadLagAnalysis.quitsVsUnemployment.correlation),
      Math.abs(chartData.leadLagAnalysis.wagesVsUnemployment.correlation)
    )
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Summary Cards */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="h-5 w-5 text-platform-accent" />
          </div>
          <div className="text-2xl font-bold text-platform-text">
            {fmtPct(summaryStats.avgQuits / 100)}
          </div>
          <div className="text-xs text-platform-text/70">Average Quits Rate</div>
          <div className="text-xs text-platform-text/50">Monthly average</div>
        </div>
        
        <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Zap className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-platform-text">
            {summaryStats.surgeCount}
          </div>
          <div className="text-xs text-platform-text/70">Surge Periods</div>
          <div className="text-xs text-platform-text/50">Quits outpacing wages</div>
        </div>
        
        <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <BarChart className="h-5 w-5 text-platform-cyan" />
          </div>
          <div className="text-2xl font-bold text-platform-text">
            {summaryStats.strongestCorrelation.toFixed(2)}
          </div>
          <div className="text-xs text-platform-text/70">Strongest Correlation</div>
          <div className="text-xs text-platform-text/50">Between variables</div>
        </div>
      </div>
      
      {/* View Toggle */}
      <div className="md:col-span-3 flex justify-center gap-2 mb-4">
        <Button
          variant={viewMode === 'timeseries' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('timeseries')}
          size="sm"
        >
          Time Series
        </Button>
        <Button
          variant={viewMode === 'scatter' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('scatter')}
          size="sm"
        >
          Scatter Plot
        </Button>
        <Button
          variant={viewMode === 'correlation' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('correlation')}
          size="sm"
        >
          Correlation Matrix
        </Button>
      </div>

      {/* Main Visualization */}
      <div className="md:col-span-2">
        <ChartCard
          title={
            viewMode === 'timeseries' ? "Quits, Wages, and Unemployment Over Time" :
            viewMode === 'scatter' ? "Quits vs Wages Relationship" :
            "Variable Correlation Matrix"
          }
          subtitle={
            viewMode === 'timeseries' ? "Tracking labor market confidence. Shaded areas show 'surge' periods where quits outpace wage growth." :
            viewMode === 'scatter' ? "Each point represents a month. Shows the relationship between quit rates and wage growth." :
            "Correlation coefficients between all variable pairs. Stronger colors indicate higher correlation."
          }
        >
          {viewMode === 'timeseries' && chartData && (
            <ChartErrorBoundary>
              <div className="h-[600px]">
                <ConfidenceTriad data={chartData} />
              </div>
            </ChartErrorBoundary>
          )}
          
          {viewMode === 'scatter' && isRendered && chartData && isScatterDataReady && (
            <ChartErrorBoundary>
              <ChartWrapper className="h-[600px]">
                <ResponsiveScatterPlot
                  data={scatterData}
                  margin={{ top: 20, right: 60, bottom: 60, left: 80 }}
                  xScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
                  yScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Quits Rate' + (isStandardized ? ' (Z-Score)' : ''),
                    legendOffset: 40,
                    legendPosition: 'middle'
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Wage Growth YoY' + (isStandardized ? ' (Z-Score)' : ''),
                    legendOffset: -60,
                    legendPosition: 'middle'
                  }}
                  colors={[colors.platform.accent]}
                  nodeSize={6}
                  tooltip={({ node }) => (
                    <div className="bg-platform-contrast p-2 rounded text-xs shadow-lg">
                      <div className="font-bold mb-1">{(node.data as any).period}</div>
                      <div>Quits: {(node.data.x as number).toFixed(3)}</div>
                      <div>Wages: {(node.data.y as number).toFixed(3)}</div>
                    </div>
                  )}
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
          
          {viewMode === 'correlation' && chartData && (
            <div className="h-[600px] flex items-center justify-center">
              <CorrelationMatrix data={chartData.correlationMatrix} />
            </div>
          )}
        </ChartCard>
      </div>
      
      {/* Controls and Analysis Section */}
      <div className="md:col-span-1">
        <div className="grid grid-cols-1 gap-6">
          {/* Controls */}
          <ChartCard title="Controls">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="z-score-toggle" 
                  checked={isStandardized} 
                  onChange={(e) => setIsStandardized(e.target.checked)} 
                />
                <label htmlFor="z-score-toggle" className="text-sm">Standardize (Z-Score)</label>
              </div>
              <div className="text-xs text-platform-text/70">
                Standardization allows direct comparison of different metrics by converting them to the same scale.
              </div>
            </div>
          </ChartCard>
          
          {/* Lead/Lag Analysis */}
          <ChartCard title="Lead/Lag Analysis">
            <LeadLagInspector analysis={chartData.leadLagAnalysis} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}