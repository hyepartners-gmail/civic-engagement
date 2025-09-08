"use client";
import { useMemo } from 'react';
import { useLab } from '@/contexts/LabContext';
import { useUi } from '@/contexts/UiContext';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useScenarioProjection } from '@/hooks/useScenarioProjection';
import { fmtShort, fmtPct } from '@/utils/number';
import { ResponsiveLine } from '@nivo/line';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import { 
  AlertTriangle, TrendingUp, TrendingDown, Target, 
  DollarSign, Calendar, Activity, Shield 
} from 'lucide-react';
import { Badge } from './ui/badge';
import { motion } from 'framer-motion';

// Enhanced KPI Card with trend indicators
const EnhancedKpiCard = ({ 
  label, 
  value, 
  trend, 
  historical, 
  color, 
  icon: Icon, 
  subtitle 
}: { 
  label: string;
  value: string;
  trend?: number;
  historical?: { level: string; message: string };
  color?: string;
  icon?: React.ComponentType<any>;
  subtitle?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-platform-contrast/50 rounded-lg p-4 border border-platform-contrast hover:border-platform-accent/50 transition-all duration-300 ${
        historical?.level === 'warning' ? 'border-amber-500/50 bg-amber-500/5' :
        historical?.level === 'danger' ? 'border-red-500/50 bg-red-500/5' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-platform-accent" />}
          <h4 className="text-sm font-medium text-platform-text/80">{label}</h4>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${
            trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-gray-400'
          }`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : 
             trend < 0 ? <TrendingDown className="h-3 w-3" /> : null}
            {trend !== 0 && `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
          </div>
        )}
      </div>
      
      <div className={`text-2xl font-bold mb-1 ${color || 'text-platform-text'}`}>
        {value}
      </div>
      
      {subtitle && (
        <div className="text-xs text-platform-text/60">{subtitle}</div>
      )}
      
      {historical && (
        <div className={`mt-2 p-2 rounded text-xs ${
          historical.level === 'warning' ? 'bg-amber-500/10 text-amber-600' :
          historical.level === 'danger' ? 'bg-red-500/10 text-red-600' :
          'bg-blue-500/10 text-blue-600'
        }`}>
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          {historical.message}
        </div>
      )}
    </motion.div>
  );
};

// Fiscal Alert Component
const FiscalAlerts = ({ projection, currentYearData }: { projection: any, currentYearData: any }) => {
  const alerts = [];
  
  if (currentYearData) {
    const deficitToGdp = Math.abs(currentYearData.deficit) / (currentYearData.debt * 0.5); // Rough GDP estimate
    const debtToGdp = currentYearData.debt / (currentYearData.debt * 0.5); // Rough GDP estimate
    
    if (deficitToGdp > 0.1) {
      alerts.push({
        level: 'danger',
        title: 'Extreme Deficit',
        message: 'Deficit exceeds 10% of GDP - historically unsustainable',
        icon: AlertTriangle
      });
    } else if (deficitToGdp > 0.05) {
      alerts.push({
        level: 'warning',
        title: 'High Deficit',
        message: 'Deficit above 5% of GDP - consider fiscal adjustments',
        icon: TrendingUp
      });
    }
    
    if (debtToGdp > 1.2) {
      alerts.push({
        level: 'danger',
        title: 'Debt Crisis Risk',
        message: 'Debt-to-GDP ratio approaching dangerous levels',
        icon: Shield
      });
    }
  }
  
  if (alerts.length === 0) {
    return (
      <div className="text-center py-6 text-platform-text/50">
        <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p className="text-sm">Fiscal health looks stable</p>
        <p className="text-xs mt-1">No immediate concerns detected</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => {
        const IconComponent = alert.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              alert.level === 'danger' ? 'bg-red-500/10 border-red-500/30' :
              'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <IconComponent className={`h-5 w-5 mt-0.5 ${
              alert.level === 'danger' ? 'text-red-500' : 'text-amber-500'
            }`} />
            <div>
              <div className="font-semibold text-sm text-platform-text">{alert.title}</div>
              <div className="text-xs text-platform-text/80">{alert.message}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default function Scoreboard() {
  const { scenario } = useLab();
  const { year } = useUi();
  const { rollup, macro, cboProjection } = useBudgetData();
  const projection = useScenarioProjection(rollup, scenario, macro, cboProjection);
  const isChartReady = useChartReady([rollup, macro, projection]);

  // Calculate trend data for enhanced KPIs
  const trendData = useMemo(() => {
    if (!projection || projection.base.length < 2) return {};
    
    const current = projection.base[0];
    const future = projection.base[1];
    
    return {
      deficitTrend: current && future ? ((future.deficit - current.deficit) / Math.abs(current.deficit)) * 100 : 0,
      debtTrend: current && future ? ((future.debt - current.debt) / current.debt) * 100 : 0,
      outlaysTrend: current && future ? ((future.outlays - current.outlays) / current.outlays) * 100 : 0,
      receiptsTrend: current && future ? ((future.receipts - current.receipts) / current.receipts) * 100 : 0,
    };
  }, [projection]);

  if (!rollup || !macro) return <div className="animate-pulse bg-platform-contrast h-full rounded-lg" />;
  
  if (!projection) {
    return <div className="animate-pulse bg-platform-contrast h-full rounded-lg" />;
  }

  if (!isChartReady) {
    return <div className="animate-pulse bg-platform-contrast h-full rounded-lg" />;
  }
  
  const currentYearData = projection.base.find(d => d.year === year);
  const hasScenarioChanges = Object.keys(scenario.deltas).length > 0 || (scenario.customPrograms && scenario.customPrograms.length > 0);

  const chartData = [
    {
      id: 'Deficit',
      color: colors.semantic.error,
      data: projection.base.map(d => ({ x: d.year, y: d.deficit })),
    },
    {
      id: 'Debt',
      color: colors.platform.accent,
      data: projection.base.map(d => ({ x: d.year, y: d.debt })),
    },
  ];

  return (
    <div className="bg-platform-card-background rounded-lg border border-platform-contrast h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-platform-contrast">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-platform-text flex items-center gap-2">
              <Activity className="h-6 w-6 text-platform-accent" />
              Fiscal Scoreboard
            </h2>
            <p className="text-sm text-platform-text/70 mt-1">
              Track the impact of your policy changes on America's fiscal health
            </p>
          </div>
          {hasScenarioChanges && (
            <Badge className="bg-platform-accent/20 text-platform-accent border-platform-accent/30">
              <Target className="h-3 w-3 mr-1" />
              Scenario Active
            </Badge>
          )}
        </div>
      </div>

      {/* Enhanced KPI Grid */}
      <div className="p-6 border-b border-platform-contrast">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <EnhancedKpiCard 
            label="Spending" 
            value={fmtShort(currentYearData?.outlays || 0)}
            trend={trendData.outlaysTrend}
            icon={DollarSign}
            subtitle="Annual outlays"
          />
          <EnhancedKpiCard 
            label="Revenue" 
            value={fmtShort(currentYearData?.receipts || 0)}
            trend={trendData.receiptsTrend}
            icon={TrendingUp}
            color="text-green-400"
            subtitle="Tax receipts"
          />
          <EnhancedKpiCard 
            label="Deficit" 
            value={fmtShort(currentYearData?.deficit || 0)}
            trend={trendData.deficitTrend}
            color="text-red-400"
            icon={TrendingDown}
            historical={
              Math.abs(currentYearData?.deficit || 0) > 2000000000000 ? {
                level: 'warning',
                message: 'Above historical peacetime levels'
              } : undefined
            }
            subtitle="Annual shortfall"
          />
          <EnhancedKpiCard 
            label="Total Debt" 
            value={fmtShort(currentYearData?.debt || 0)}
            trend={trendData.debtTrend}
            color="text-platform-accent"
            icon={Shield}
            historical={
              (currentYearData?.debt || 0) > 30000000000000 ? {
                level: 'danger',
                message: 'Near historical highs'
              } : undefined
            }
            subtitle="Accumulated debt"
          />
        </div>
      </div>

      {/* Fiscal Alerts */}
      <div className="p-6 border-b border-platform-contrast">
        <h3 className="text-lg font-semibold mb-4 text-platform-text flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Fiscal Health Check
        </h3>
        <FiscalAlerts projection={projection} currentYearData={currentYearData} />
      </div>

      {/* Enhanced Chart */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-platform-text flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            10-Year Fiscal Trajectory
          </h3>
          {hasScenarioChanges && (
            <Badge variant="outline" className="text-xs border-platform-accent text-platform-accent">
              Showing your scenario impact
            </Badge>
          )}
        </div>
        
        <ChartWrapper 
          fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse rounded" />}
          className="h-full w-full"
        >
          <ResponsiveLine
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
            xScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
            yScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
            axisLeft={{ legend: 'USD', legendOffset: -60, format: v => fmtShort(v) }}
            axisBottom={{ legend: 'Year', legendOffset: 40 }}
            colors={[colors.semantic.error, colors.platform.accent]}
            lineWidth={3}
            pointSize={8}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'serieColor' }}
            pointColor={{ theme: 'background' }}
            useMesh={true}
            animate={true}
            motionConfig="gentle"
            tooltip={({ point }) => (
              <div className="bg-platform-contrast p-3 rounded shadow-lg border border-platform-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: point.seriesColor }} />
                  <strong className="text-platform-text">{point.seriesId}</strong>
                </div>
                <div className="text-platform-text">
                  FY {point.data.xFormatted}: <strong>{fmtShort(point.data.y as number)}</strong>
                </div>
                {point.seriesId === 'Deficit' && (point.data.y as number) > 2000000000000 && (
                  <div className="text-xs text-amber-600 mt-1">
                    ⚠️ Above sustainable levels
                  </div>
                )}
              </div>
            )}
            legends={[
              { 
                anchor: 'top-left', 
                direction: 'row', 
                itemsSpacing: 20, 
                itemWidth: 80, 
                itemHeight: 20, 
                translateY: -20,
                symbolSize: 12
              }
            ]}
            theme={{
              axis: { 
                ticks: { text: { fill: colors.platform.text, fontSize: 10 } }, 
                legend: { text: { fill: colors.platform.text, fontSize: 12 } } 
              },
              grid: { line: { stroke: colors.platform.contrast, strokeWidth: 1 } },
              tooltip: { 
                container: { 
                  background: colors.platform.contrast, 
                  color: colors.platform.text, 
                  fontSize: '12px',
                  border: `1px solid ${colors.platform.accent}20`
                } 
              },
              legends: { text: { fill: colors.platform.text } },
            }}
          />
        </ChartWrapper>
      </div>
      
      {/* Bottom Context */}
      <div className="p-4 border-t border-platform-contrast bg-platform-contrast/20">
        <div className="text-center text-xs text-platform-text/60">
          💡 <strong>Tip:</strong> Use the policy controls to see how different scenarios affect these projections.
          {hasScenarioChanges && ' Your current changes are reflected in the chart above.'}
        </div>
      </div>
    </div>
  );
}