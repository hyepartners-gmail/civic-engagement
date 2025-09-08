"use client";
import { useMemo } from 'react';
import { useLab } from '@/contexts/LabContext';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useScenarioProjection } from '@/hooks/useScenarioProjection';
import { fmtShort, fmtPct } from '@/utils/number';
import { 
  Calculator, TrendingUp, TrendingDown, AlertTriangle, 
  Clock, Globe, Users, DollarSign, Target, Zap,
  ArrowRight, Lightbulb, Shield, Timer
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'framer-motion';

// Real-world comparisons for context
const REAL_WORLD_COMPARISONS = {
  spending: [
    { name: "NASA Annual Budget", value: 25000000000, icon: "🚀" },
    { name: "All US K-12 Education", value: 800000000000, icon: "🎓" },
    { name: "COVID-19 Relief (CARES)", value: 2200000000000, icon: "💊" },
    { name: "Highway System (2021)", value: 50000000000, icon: "🛣️" },
    { name: "Social Security (Annual)", value: 1200000000000, icon: "👥" }
  ],
  timeframes: [
    { label: "1 day", divisor: 365 },
    { label: "1 week", divisor: 52 },
    { label: "1 month", divisor: 12 },
    { label: "per citizen", divisor: 330000000 }
  ]
};

// Debt trajectory risk levels
const DEBT_RISK_LEVELS = {
  low: { max: 0.6, label: "Sustainable", color: "text-green-500", bg: "bg-green-500/10" },
  moderate: { max: 0.9, label: "Manageable", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  high: { max: 1.2, label: "Concerning", color: "text-orange-500", bg: "bg-orange-500/10" },
  critical: { max: Infinity, label: "Critical", color: "text-red-500", bg: "bg-red-500/10" }
};

interface FiscalImpactCalculatorProps {
  className?: string;
}

export default function FiscalImpactCalculator({ className }: FiscalImpactCalculatorProps) {
  const { scenario } = useLab();
  const { rollup, macro, cboProjection } = useBudgetData();
  const projection = useScenarioProjection(rollup, scenario, macro, cboProjection);

  const impactAnalysis = useMemo(() => {
    if (!projection || !rollup?.years) return null;

    const currentYear = new Date().getFullYear() - 1;
    const baselineData = rollup.years[currentYear];
    const currentYearProjection = projection.base.find(d => d.year === currentYear);
    const futureProjection = projection.base.find(d => d.year === currentYear + 10);

    if (!baselineData || !currentYearProjection || !futureProjection) return null;

    // Calculate spending changes from scenario
    const totalDeltaImpact = Object.entries(scenario.deltas || {}).reduce((total, [funcId, delta]) => {
      const estimatedFunctionSpending = baselineData.outlays * 0.1; // Simplified
      return total + (estimatedFunctionSpending * (delta as number));
    }, 0);

    const customProgramsImpact = (scenario.customPrograms || []).reduce((total: number, program: any) => {
      return total + (program.type === 'spending' ? program.amount * 1e9 : -program.amount * 1e9);
    }, 0);

    const totalImpact = totalDeltaImpact + customProgramsImpact;
    const newOutlays = baselineData.outlays + totalImpact;
    const newDeficit = newOutlays - baselineData.receipts;
    const deficitChange = newDeficit - baselineData.deficit;

    // Debt trajectory analysis
    const projectedDebtGrowth = ((futureProjection.debt - currentYearProjection.debt) / currentYearProjection.debt) * 100;
    const estimatedGdp = currentYearProjection.debt * 0.5; // Very rough estimate
    const debtToGdpRatio = currentYearProjection.debt / estimatedGdp;

    return {
      totalImpact,
      deficitChange,
      newDeficit,
      newOutlays,
      projectedDebtGrowth,
      debtToGdpRatio,
      tenYearDebtProjection: futureProjection.debt,
      hasChanges: Math.abs(totalImpact) > 1000000000 // Changes > $1B
    };
  }, [scenario, projection, rollup]);

  if (!impactAnalysis) {
    return (
      <div className={`bg-platform-card-background p-6 rounded-lg border border-platform-contrast ${className}`}>
        <div className="text-center text-platform-text/50">
          <Calculator className="h-8 w-8 mx-auto mb-2" />
          <p>Make policy changes to see fiscal impact analysis</p>
        </div>
      </div>
    );
  }

  const getRiskLevel = (debtToGdp: number) => {
    for (const [level, config] of Object.entries(DEBT_RISK_LEVELS)) {
      if (debtToGdp <= config.max) return { level, ...config };
    }
    return { level: 'critical', ...DEBT_RISK_LEVELS.critical };
  };

  const riskLevel = getRiskLevel(impactAnalysis.debtToGdpRatio);

  const getComparison = (amount: number) => {
    const absAmount = Math.abs(amount);
    return REAL_WORLD_COMPARISONS.spending.find(comp => 
      absAmount >= comp.value * 0.5 && absAmount <= comp.value * 2
    ) || REAL_WORLD_COMPARISONS.spending[0];
  };

  const spendingComparison = getComparison(impactAnalysis.totalImpact);

  return (
    <div className={`bg-platform-card-background rounded-lg border border-platform-contrast ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-platform-contrast">
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-platform-accent" />
          <div>
            <h3 className="text-xl font-bold text-platform-text">Fiscal Impact Analysis</h3>
            <p className="text-sm text-platform-text/70">Real-world context for your policy changes</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <AnimatePresence>
          {impactAnalysis.hasChanges ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Primary Impact */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className={`p-4 ${
                  impactAnalysis.totalImpact > 0 ? 'border-red-500/30 bg-red-500/5' : 
                  impactAnalysis.totalImpact < 0 ? 'border-green-500/30 bg-green-500/5' : 
                  'border-gray-500/30 bg-gray-500/5'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm font-medium">Budget Impact</span>
                  </div>
                  <div className={`text-2xl font-bold ${
                    impactAnalysis.totalImpact > 0 ? 'text-red-500' : 
                    impactAnalysis.totalImpact < 0 ? 'text-green-500' : 'text-gray-500'
                  }`}>
                    {impactAnalysis.totalImpact > 0 ? '+' : ''}{fmtShort(impactAnalysis.totalImpact)}
                  </div>
                  <div className="text-xs text-platform-text/60 mt-1">
                    {impactAnalysis.totalImpact > 0 ? 'Additional spending' : 
                     impactAnalysis.totalImpact < 0 ? 'Spending reduction' : 'No change'}
                  </div>
                </Card>

                <Card className={`p-4 ${
                  impactAnalysis.deficitChange > 0 ? 'border-red-500/30 bg-red-500/5' : 
                  impactAnalysis.deficitChange < 0 ? 'border-green-500/30 bg-green-500/5' : 
                  'border-gray-500/30 bg-gray-500/5'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-sm font-medium">Deficit Change</span>
                  </div>
                  <div className={`text-2xl font-bold ${
                    impactAnalysis.deficitChange > 0 ? 'text-red-500' : 
                    impactAnalysis.deficitChange < 0 ? 'text-green-500' : 'text-gray-500'
                  }`}>
                    {impactAnalysis.deficitChange > 0 ? '+' : ''}{fmtShort(impactAnalysis.deficitChange)}
                  </div>
                  <div className="text-xs text-platform-text/60 mt-1">
                    {impactAnalysis.deficitChange > 0 ? 'Higher deficit' : 
                     impactAnalysis.deficitChange < 0 ? 'Lower deficit' : 'No change'}
                  </div>
                </Card>

                <Card className={`p-4 border-platform-accent/30 bg-platform-accent/5`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Debt Risk</span>
                  </div>
                  <div className={`text-lg font-bold ${riskLevel.color}`}>
                    {riskLevel.label}
                  </div>
                  <div className="text-xs text-platform-text/60 mt-1">
                    {fmtPct(impactAnalysis.debtToGdpRatio)} debt-to-GDP
                  </div>
                </Card>
              </div>

              {/* Real-world Comparison */}
              <Card className="p-4 bg-platform-accent/5 border-platform-accent/20">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-5 w-5 text-platform-accent" />
                  <span className="font-semibold text-platform-text">Real-World Context</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{spendingComparison.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm text-platform-text">
                      Your budget change of <strong>{fmtShort(Math.abs(impactAnalysis.totalImpact))}</strong> is
                      roughly equivalent to <strong>{spendingComparison.name}</strong>
                    </p>
                    <div className="text-xs text-platform-text/60 mt-1">
                      {spendingComparison.name}: {fmtShort(spendingComparison.value)} annually
                    </div>
                  </div>
                </div>
              </Card>

              {/* Time-based Breakdown */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="h-5 w-5" />
                  <span className="font-semibold text-platform-text">Impact Over Time</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {REAL_WORLD_COMPARISONS.timeframes.map(timeframe => {
                    const amount = Math.abs(impactAnalysis.totalImpact) / timeframe.divisor;
                    return (
                      <div key={timeframe.label} className="text-center p-2 bg-platform-contrast/20 rounded">
                        <div className="text-lg font-bold text-platform-accent">
                          {amount < 1 ? `$${(amount * 100).toFixed(0)}¢` : fmtShort(amount)}
                        </div>
                        <div className="text-xs text-platform-text/60">{timeframe.label}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Debt Trajectory Warning */}
              {impactAnalysis.projectedDebtGrowth > 5 && (
                <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-600">Debt Trajectory Warning</div>
                      <p className="text-sm text-platform-text/80 mt-1">
                        Your scenario projects debt growing by <strong>{impactAnalysis.projectedDebtGrowth.toFixed(1)}%</strong> over 10 years, 
                        reaching <strong>{fmtShort(impactAnalysis.tenYearDebtProjection)}</strong> by 2034.
                      </p>
                      <p className="text-xs text-amber-600 mt-2">
                        Consider balancing spending increases with revenue measures or spending cuts elsewhere.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Economic Context */}
              <Card className="p-4 bg-blue-500/5 border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold text-platform-text">Economic Context</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-platform-text mb-1">Multiplier Effects</div>
                    <p className="text-platform-text/70">
                      {impactAnalysis.totalImpact > 0 ? 
                        'Increased spending may stimulate economic growth but could increase inflation.' :
                        'Spending cuts may reduce economic growth but could help control inflation.'
                      }
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-platform-text mb-1">Interest Burden</div>
                    <p className="text-platform-text/70">
                      Higher deficits increase future interest payments, reducing funds available for other priorities.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-platform-text/50"
            >
              <Target className="h-12 w-12 mx-auto mb-3" />
              <p className="text-lg font-medium mb-2">Ready for Policy Analysis</p>
              <p className="text-sm">
                Use the policy controls to make changes and see their fiscal impact
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}