'use client';
import { useMemo, useState } from 'react';
import ChartCard from '@/components/charts/ChartCard';
import { useEmploymentData } from '@/hooks/useEmploymentData';
import { useBudgetData } from '@/hooks/useBudgetData';
import { deflate, alignMonthly, toFYPoints } from '@/lib/employmentSelectors';
import { selectTotals } from '@/selectors/budgetSelectors';
import { fmtShort, fmtPct } from '@/utils/number';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from 'lucide-react';

interface WageVsBudgetData {
  fy: number;
  realWage: number | null;
  deficit: number | null;
  spending: number | null;
  deficitPctGdp: number | null;
}

export default function StoryWorkAndWallet() {
  const { data: employmentArtifact, isLoading: isLoadingEmployment } = useEmploymentData();
  const { rollup, macro, isLoading: isLoadingBudget } = useBudgetData();
  const [viewMode, setViewMode] = useState<'comparison' | 'correlation'>('comparison');
  const isChartReady = useChartReady([employmentArtifact, rollup, macro]);

  const { chartData, summary, correlationData } = useMemo(() => {
    if (!employmentArtifact || !rollup || !macro) {
      return { chartData: [], summary: null, correlationData: [] };
    }

    // Get real wages (deflated by CPI)
    const nominalWages = employmentArtifact.series['ces.ahe_total_private'] || employmentArtifact.series['ces_ahe_total_private'];
    const cpiSeries = employmentArtifact.series['cpi.u_all_items'] || employmentArtifact.series['cpi_u_all_items'];
    
    if (!nominalWages || !cpiSeries) {
      console.warn('Missing wage or CPI data for Work & Wallet narrative');
      return { chartData: [], summary: null, correlationData: [] };
    }

    const realWages = deflate(nominalWages, cpiSeries);
    
    // Align employment data by fiscal year
    const alignedData = alignMonthly(employmentArtifact, ['ces.ahe_total_private']);
    const fyWagePoints = toFYPoints(alignedData);
    
    // Combine with budget data
    const combinedData: WageVsBudgetData[] = fyWagePoints
      .filter(point => point.fy >= 1990 && point.fy <= 2024)
      .map(point => {
        const budgetTotals = selectTotals(rollup, macro, point.fy, 'nominal');
        const budgetTotalsPct = selectTotals(rollup, macro, point.fy, '%GDP');
        
        // Find matching real wage
        const monthIndex = employmentArtifact.index.findIndex(idx => idx.fy === point.fy);
        const realWage = monthIndex >= 0 ? realWages[monthIndex] : null;
        
        return {
          fy: point.fy,
          realWage,
          deficit: budgetTotals.deficit,
          spending: budgetTotals.outlays,
          deficitPctGdp: budgetTotalsPct.deficit
        };
      })
      .filter(d => d.realWage !== null && d.deficit !== null && d.spending !== null);

    // Calculate summary statistics
    const latestData = combinedData[combinedData.length - 1];
    const earliestData = combinedData[0];
    
    const wageGrowth = latestData && earliestData && earliestData.realWage ? 
      ((latestData.realWage! - earliestData.realWage) / earliestData.realWage) * 100 : 0;
    
    const avgDeficit = combinedData.reduce((sum, d) => sum + (d.deficitPctGdp || 0), 0) / combinedData.length;
    
    const summary = {
      timespan: `${earliestData?.fy}-${latestData?.fy}`,
      wageGrowth,
      avgDeficit,
      latestWage: latestData?.realWage || 0,
      latestDeficit: latestData?.deficitPctGdp || 0
    };

    // Prepare chart data for line chart (comparison mode)
    const lineData = [
      {
        id: 'Real Wages (2024 $)',
        data: combinedData.map(d => ({
          x: d.fy,
          y: d.realWage || 0
        }))
      },
      {
        id: 'Federal Deficit (% of GDP)',
        data: combinedData.map(d => ({
          x: d.fy,
          y: Math.abs(d.deficitPctGdp || 0) * 10 // Scale for visibility
        }))
      }
    ];

    // Prepare correlation data (scatter plot)
    const correlationData = combinedData.map(d => ({
      id: d.fy.toString(),
      x: d.realWage || 0,
      y: Math.abs(d.deficitPctGdp || 0),
      fy: d.fy
    }));

    return { 
      chartData: lineData, 
      summary, 
      correlationData: [{ id: 'wage-deficit', data: correlationData }]
    };
  }, [employmentArtifact, rollup, macro]);

  if (isLoadingEmployment || isLoadingBudget) {
    return <div>Loading wage and budget data...</div>;
  }

  if (!isChartReady || chartData.length === 0) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-3">
          <ChartCard
            title="Work & The Wallet"
            subtitle="Real wages vs federal fiscal policy data."
          >
            <div className="flex items-center justify-center h-full text-platform-text/70 bg-platform-contrast/30 rounded-lg">
              <div className="text-center p-8">
                <p className="font-semibold">Data Loading</p>
                <p className="text-sm mt-2">
                  Preparing wage and budget correlation analysis...
                </p>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Summary Cards */}
      <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-platform-text">
            {summary ? fmtPct(summary.wageGrowth / 100) : 'N/A'}
          </div>
          <div className="text-xs text-platform-text/70">Real Wage Growth</div>
          <div className="text-xs text-platform-text/50">{summary?.timespan}</div>
        </div>
        
        <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingDown className="h-5 w-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-platform-text">
            {summary ? fmtPct(summary.avgDeficit / 100) : 'N/A'}
          </div>
          <div className="text-xs text-platform-text/70">Avg. Deficit/GDP</div>
          <div className="text-xs text-platform-text/50">{summary?.timespan}</div>
        </div>
        
        <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <DollarSign className="h-5 w-5 text-platform-accent" />
          </div>
          <div className="text-2xl font-bold text-platform-text">
            {summary ? `$${summary.latestWage.toFixed(0)}` : 'N/A'}
          </div>
          <div className="text-xs text-platform-text/70">Current Real Wage</div>
          <div className="text-xs text-platform-text/50">2024 dollars/hour</div>
        </div>
        
        <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <PiggyBank className="h-5 w-5 text-platform-cyan" />
          </div>
          <div className="text-2xl font-bold text-platform-text">
            {summary ? fmtPct(summary.latestDeficit / 100) : 'N/A'}
          </div>
          <div className="text-xs text-platform-text/70">Current Deficit/GDP</div>
          <div className="text-xs text-platform-text/50">Latest fiscal year</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="md:col-span-3 flex justify-center gap-2 mb-4">
        <Button
          variant={viewMode === 'comparison' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('comparison')}
          size="sm"
        >
          Time Series
        </Button>
        <Button
          variant={viewMode === 'correlation' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('correlation')}
          size="sm"
        >
          Correlation
        </Button>
      </div>

      {/* Main Chart */}
      <div className="md:col-span-3">
        <ChartCard
          title={viewMode === 'comparison' ? 'Real Wages vs Federal Deficit Over Time' : 'Wage-Deficit Correlation'}
          subtitle={viewMode === 'comparison' ? 
            'Real wages (inflation-adjusted) compared to federal deficit as % of GDP. Deficit scaled 10x for visibility.' :
            'Each point represents a fiscal year. X-axis: real wages, Y-axis: deficit as % of GDP.'}
        >
          <ChartWrapper className="h-[400px]">
            {viewMode === 'comparison' ? (
              <ResponsiveLine
                data={chartData}
                margin={{ top: 20, right: 120, bottom: 60, left: 80 }}
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
                  legend: 'Value',
                  legendOffset: -60,
                  legendPosition: 'middle'
                }}
                colors={[colors.platform.accent, colors.semantic.error]}
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
                    translateX: 110,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemDirection: 'left-to-right',
                    itemWidth: 100,
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
            ) : (
              <ResponsiveLine
                data={correlationData}
                margin={{ top: 20, right: 60, bottom: 60, left: 80 }}
                xScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
                yScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Real Hourly Wage (2024 $)',
                  legendOffset: 40,
                  legendPosition: 'middle'
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Federal Deficit (% of GDP)',
                  legendOffset: -60,
                  legendPosition: 'middle'
                }}
                colors={[colors.platform.cyan]}
                lineWidth={0}
                enablePoints={true}
                pointSize={8}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                pointColor={{ theme: 'background' }}
                enableArea={false}
                tooltip={({ point }) => (
                  <div className="bg-platform-contrast p-2 rounded text-xs shadow-lg">
                    <div className="font-bold mb-1">FY {(point.data as any).fy}</div>
                    <div>Real Wage: ${point.data.x}</div>
                    <div>Deficit: {fmtPct((point.data.y as number) / 100)}</div>
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
            )}
          </ChartWrapper>
        </ChartCard>
      </div>

      {/* Analysis Panel */}
      <div className="md:col-span-3">
        <ChartCard title="Analysis & Insights">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-platform-accent mb-3">Key Findings</h4>
              <ul className="space-y-2 text-sm text-platform-text/90">
                <li className="flex items-start gap-2">
                  <span className="text-platform-accent">•</span>
                  Real wages have grown by {summary ? fmtPct(summary.wageGrowth / 100) : 'N/A'} over the analysis period
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-platform-accent">•</span>
                  Federal deficit averaged {summary ? fmtPct(summary.avgDeficit / 100) : 'N/A'} of GDP
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-platform-accent">•</span>
                  Current real wages are around ${summary ? summary.latestWage.toFixed(0) : 'N/A'} per hour
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-platform-accent">•</span>
                  Current deficit represents {summary ? fmtPct(summary.latestDeficit / 100) : 'N/A'} of GDP
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-platform-accent mb-3">Economic Context</h4>
              <p className="text-sm text-platform-text/90 leading-relaxed">
                This analysis reveals the relationship between worker compensation and federal fiscal policy. 
                Real wages represent the purchasing power of workers after accounting for inflation, while 
                federal deficits reflect government spending vs. revenue. Understanding this relationship 
                helps illuminate how fiscal policy impacts working Americans' economic well-being.
              </p>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}