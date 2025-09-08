"use client";
import { useState, useMemo } from 'react';
import { useYou } from '@/contexts/YouContext';
import { useTax } from '@/contexts/TaxContext';
import { usePersonalTax } from '@/hooks/usePersonalTax';
import { useHierarchy } from '@/hooks/useHierarchy';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useUi } from '@/contexts/UiContext';
import { selectTotals } from '@/selectors/budgetSelectors';
import { fmtShort } from '@/utils/number';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, TrendingDown, RotateCcw, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PolicyChange {
  type: 'spending' | 'tax';
  category: string;
  change: number; // percentage change
  label: string;
}

export default function PolicyImpactSimulator() {
  const { scenario } = useYou();
  const { input } = scenario;
  const { policy } = useTax();
  const { root } = useHierarchy();
  const { year } = useUi();
  const { rollup, macro } = useBudgetData();
  const { total: baselineTaxLiability } = usePersonalTax(input, policy);
  
  const [activeChanges, setActiveChanges] = useState<PolicyChange[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('func:000'); // Defense default
  const [spendingChange, setSpendingChange] = useState([0]);
  const [taxChange, setTaxChange] = useState([0]);

  const policyOptions = useMemo(() => {
    if (!root) return [];
    
    return root.children
      .filter(node => node.values[year]?.nominal > 1000000000) // Only major categories (>$1B)
      .map(node => ({
        id: node.id,
        name: node.name,
        spending: node.values[year]?.nominal || 0
      }))
      .sort((a, b) => b.spending - a.spending)
      .slice(0, 8); // Top 8 categories
  }, [root, year]);

  const impactCalculation = useMemo(() => {
    if (!root || !rollup || !macro) return null;

    const baselineTotals = selectTotals(rollup, macro, year, 'nominal');
    let modifiedSpending = baselineTotals.outlays;
    let modifiedTaxes = baselineTaxLiability;
    let personalImpacts: any[] = [];

    // Apply spending changes
    const spendingChangeAmount = (spendingChange[0] / 100) * (policyOptions.find(p => p.id === selectedCategory)?.spending || 0);
    modifiedSpending += spendingChangeAmount;

    // Apply tax changes (simplified)
    const taxChangeAmount = (taxChange[0] / 100) * baselineTaxLiability;
    modifiedTaxes += taxChangeAmount;

    // Calculate new deficit
    const baselineDeficit = baselineTotals.deficit;
    const newDeficit = modifiedSpending - baselineTotals.receipts + taxChangeAmount;
    const deficitChange = newDeficit - baselineDeficit;

    // Calculate personal allocation changes
    if (root && baselineTaxLiability > 0) {
      const totalFederalSpending = root.values[year]?.nominal || 0;
      const selectedNode = root.children.find(n => n.id === selectedCategory);
      
      if (selectedNode && totalFederalSpending > 0) {
        const originalAllocation = (selectedNode.values[year]?.nominal || 0) / totalFederalSpending * baselineTaxLiability;
        const newAllocation = ((selectedNode.values[year]?.nominal || 0) + spendingChangeAmount) / (totalFederalSpending + spendingChangeAmount) * modifiedTaxes;
        const personalChange = newAllocation - originalAllocation;

        personalImpacts.push({
          category: selectedNode.name,
          change: personalChange,
          newAmount: newAllocation
        });
      }
    }

    return {
      spendingChange: spendingChangeAmount,
      taxChange: taxChangeAmount,
      deficitChange,
      personalTaxChange: taxChangeAmount,
      newTotalTax: modifiedTaxes,
      personalImpacts
    };
  }, [root, rollup, macro, year, baselineTaxLiability, selectedCategory, spendingChange, taxChange, policyOptions]);

  const resetChanges = () => {
    setSpendingChange([0]);
    setTaxChange([0]);
    setActiveChanges([]);
  };

  const hasChanges = spendingChange[0] !== 0 || taxChange[0] !== 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-platform-text mb-2 flex items-center justify-center gap-2">
          <Calculator className="h-6 w-6" />
          Policy Impact Simulator
        </h2>
        <p className="text-platform-text/70">
          See how government policy changes would affect your personal tax receipt and the national deficit
        </p>
      </div>

      {/* Policy Controls */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Spending Changes */}
        <Card className="p-6 bg-platform-card-background border-platform-contrast">
          <h3 className="text-lg font-semibold mb-4 text-platform-text">Adjust Government Spending</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-platform-text/80 mb-2 block">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 rounded bg-platform-contrast border border-platform-accent text-platform-text"
              >
                {policyOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name} ({fmtShort(option.spending)})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-platform-text/80 mb-2 block">
                Spending Change: {spendingChange[0] > 0 ? '+' : ''}{spendingChange[0]}%
              </label>
              <Slider
                value={spendingChange}
                onValueChange={setSpendingChange}
                max={50}
                min={-50}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-platform-text/60 mt-1">
                <span>-50% Cut</span>
                <span>No Change</span>
                <span>+50% Increase</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tax Changes */}
        <Card className="p-6 bg-platform-card-background border-platform-contrast">
          <h3 className="text-lg font-semibold mb-4 text-platform-text">Adjust Your Tax Rate</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-platform-text/80 mb-2 block">
                Tax Change: {taxChange[0] > 0 ? '+' : ''}{taxChange[0]}%
              </label>
              <Slider
                value={taxChange}
                onValueChange={setTaxChange}
                max={30}
                min={-30}
                step={2}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-platform-text/60 mt-1">
                <span>-30% Tax Cut</span>
                <span>Current Rate</span>
                <span>+30% Tax Increase</span>
              </div>
            </div>
            
            <div className="bg-platform-contrast/20 p-3 rounded">
              <div className="text-sm">
                <div>Current Tax: <span className="font-mono">{fmtShort(baselineTaxLiability)}</span></div>
                {hasChanges && impactCalculation && (
                  <div className={`font-bold ${
                    impactCalculation.personalTaxChange > 0 ? 'text-red-500' : 'text-green-500'
                  }`}>
                    New Tax: <span className="font-mono">{fmtShort(impactCalculation.newTotalTax)}</span>
                    <span className="ml-2 text-xs">
                      ({impactCalculation.personalTaxChange > 0 ? '+' : ''}{fmtShort(impactCalculation.personalTaxChange)})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Impact Results */}
      <AnimatePresence>
        {hasChanges && impactCalculation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Impact Chips */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  {impactCalculation.personalTaxChange > 0 ? 
                    <TrendingUp className="h-5 w-5 text-red-500" /> : 
                    <TrendingDown className="h-5 w-5 text-green-500" />
                  }
                  <span className="font-semibold text-platform-text">Your Tax Impact</span>
                </div>
                <div className={`text-2xl font-bold ${
                  impactCalculation.personalTaxChange > 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {impactCalculation.personalTaxChange > 0 ? '+' : ''}{fmtShort(impactCalculation.personalTaxChange)}
                </div>
                <div className="text-xs text-platform-text/70">
                  {impactCalculation.personalTaxChange > 0 ? 'More taxes paid' : 'Tax savings'}
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-red-600/10 border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  {impactCalculation.deficitChange > 0 ? 
                    <TrendingUp className="h-5 w-5 text-red-500" /> : 
                    <TrendingDown className="h-5 w-5 text-green-500" />
                  }
                  <span className="font-semibold text-platform-text">Deficit Impact</span>
                </div>
                <div className={`text-2xl font-bold ${
                  impactCalculation.deficitChange > 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {impactCalculation.deficitChange > 0 ? '+' : ''}{fmtShort(impactCalculation.deficitChange)}
                </div>
                <div className="text-xs text-platform-text/70">
                  {impactCalculation.deficitChange > 0 ? 'Higher deficit' : 'Lower deficit'}
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-5 w-5 text-purple-500" />
                  <span className="font-semibold text-platform-text">Spending Impact</span>
                </div>
                <div className={`text-2xl font-bold ${
                  impactCalculation.spendingChange > 0 ? 'text-blue-500' : 'text-orange-500'
                }`}>
                  {impactCalculation.spendingChange > 0 ? '+' : ''}{fmtShort(impactCalculation.spendingChange)}
                </div>
                <div className="text-xs text-platform-text/70">
                  Change in selected category
                </div>
              </Card>
            </div>

            {/* Caveats */}
            <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-platform-text/80">
                  <div className="font-semibold mb-1">Important Caveats:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• This is <strong>static scoring</strong> - doesn't account for economic behavioral changes</li>
                    <li>• Real policy changes involve complex interactions not modeled here</li>
                    <li>• Assumes all other spending and revenue sources remain constant</li>
                    <li>• Actual implementation would require Congressional approval and phase-in periods</li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Button */}
      {hasChanges && (
        <div className="text-center">
          <Button
            onClick={resetChanges}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All Changes
          </Button>
        </div>
      )}
    </div>
  );
}