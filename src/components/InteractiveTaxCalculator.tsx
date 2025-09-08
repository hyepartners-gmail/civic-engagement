"use client";
import { useState, useMemo } from 'react';
import { useYou } from '@/contexts/YouContext';
import { useTax } from '@/contexts/TaxContext';
import { usePersonalTax } from '@/hooks/usePersonalTax';
import { fmtShort } from '@/utils/number';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calculator, DollarSign, Users, FileText, Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';

interface InteractiveTaxCalculatorProps {
  onCalculationChange?: (tax: number) => void;
}

const INCOME_PRESETS = [
  { label: "Minimum Wage ($15,080)", value: 15080 },
  { label: "Median US Income ($45,000)", value: 45000 },
  { label: "Middle Class ($75,000)", value: 75000 },
  { label: "Upper Middle ($125,000)", value: 125000 },
  { label: "High Income ($200,000)", value: 200000 },
  { label: "Top 5% ($350,000)", value: 350000 },
  { label: "Custom Amount", value: -1 }
];

const FILING_STATUS_INFO = {
  single: { emoji: "👤", description: "Individual taxpayer" },
  married_joint: { emoji: "👫", description: "Married filing together" }
};

export default function InteractiveTaxCalculator({ onCalculationChange }: InteractiveTaxCalculatorProps) {
  const { scenario, setInput } = useYou();
  const { input } = scenario;
  const { policy } = useTax();
  const { total: taxLiability } = usePersonalTax(input, policy);
  
  const [usePresets, setUsePresets] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState(45000);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Animate tax calculation changes
  useMemo(() => {
    const timer = setTimeout(() => {
      onCalculationChange?.(taxLiability);
    }, 100);
    return () => clearTimeout(timer);
  }, [taxLiability, onCalculationChange]);

  const updateInput = (updates: Partial<typeof input>) => {
    setInput(updates);
  };

  const applyPreset = (presetValue: number) => {
    if (presetValue === -1) {
      setUsePresets(false);
    } else {
      setSelectedPreset(presetValue);
      updateInput({ income: presetValue });
      setUsePresets(true);
    }
  };

  const dailyTax = taxLiability / 365;
  const hourlyTax = taxLiability / (365 * 8); // Assuming 8-hour workday
  const monthlyTax = taxLiability / 12;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          className="inline-flex items-center gap-2 text-2xl font-bold text-platform-text mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Sparkles className="h-6 w-6 text-platform-accent" />
          Smart Tax Calculator
        </motion.div>
        <p className="text-platform-text/70">
          Discover your federal tax contribution and see where every dollar goes
        </p>
      </div>

      {/* Quick Presets */}
      <Card className="p-6 bg-platform-card-background border-platform-contrast">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-lg font-semibold flex items-center gap-2 text-platform-text">
            <DollarSign className="h-5 w-5" />
            Income Level
          </Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="use-presets" className="text-sm text-platform-text">Quick Select</Label>
            <Switch
              id="use-presets"
              checked={usePresets}
              onCheckedChange={setUsePresets}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {usePresets ? (
            <motion.div
              key="presets"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              {INCOME_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedPreset === preset.value ? "default" : "outline"}
                  onClick={() => applyPreset(preset.value)}
                  className={`h-auto p-3 text-left flex flex-col items-start 
                    ${selectedPreset === preset.value 
                      ? "bg-platform-accent text-white border-platform-accent hover:bg-platform-accent/90" 
                      : "bg-platform-contrast text-platform-text border-platform-accent hover:bg-platform-accent/10"
                    }`}
                >
                  <span className="text-white">{preset.label}</span>
                  {preset.value > 0 && (
                    <span className="font-mono text-sm text-white">
                      {fmtShort(preset.value)}
                    </span>
                  )}
                </Button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="custom"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="income" className="text-platform-text">Annual Income</Label>
                  <Input
                    id="income"
                    type="number"
                    value={input.income}
                    onChange={(e) => updateInput({ income: Number(e.target.value) })}
                    className="text-platform-text text-lg font-mono bg-platform-contrast border-platform-accent"
                    placeholder="Enter your annual income"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setUsePresets(true)}
                  className="mt-6 border-platform-accent text-platform-text hover:bg-platform-accent/10"
                >
                  Use Presets
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Filing Details */}
      <Card className="p-6 bg-platform-card-background border-platform-contrast">
        <Label className="text-lg font-semibold mb-4 flex items-center gap-2 text-platform-text">
          <Users className="h-5 w-5" />
          Taxpayer Details
        </Label>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="filing-status" className="mb-2 block text-platform-text">Filing Status</Label>
            <Select
              value={input.filingStatus}
              onValueChange={(value: any) => updateInput({ filingStatus: value })}
            >
              <SelectTrigger className="text-platform-text bg-platform-contrast border-platform-accent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
                {Object.entries(FILING_STATUS_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{info.emoji}</span>
                      <span>{info.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="dependents" className="mb-2 block text-platform-text">Number of Dependents</Label>
            <Input
              id="dependents"
              type="number"
              min="0"
              max="10"
              value={input.dependents}
              onChange={(e) => updateInput({ dependents: Number(e.target.value) })}
              className="text-platform-text bg-platform-contrast border-platform-accent"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-platform-text/70 text-sm hover:text-platform-text"
          >
            {showAdvanced ? '↑ Hide' : '↓ Show'} Advanced Options
          </Button>
          
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-platform-contrast space-y-4"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deductions" className="text-platform-text">Standard Deductions</Label>
                    <Input
                      id="deductions"
                      type="number"
                      value={input.deductionsApprox || 0}
                      onChange={(e) => updateInput({ deductionsApprox: Number(e.target.value) })}
                      placeholder="Additional deductions"
                      className="text-platform-text bg-platform-contrast border-platform-accent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payroll" className="text-platform-text">Include Payroll Taxes</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Switch
                        id="payroll"
                        checked={input.payrollIncluded || false}
                        onCheckedChange={(checked) => updateInput({ payrollIncluded: checked })}
                      />
                      <span className="text-platform-text/70 text-sm">
                        {input.payrollIncluded ? 'Including' : 'Excluding'} FICA taxes
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Tax Results */}
      <Card className="p-6 bg-gradient-to-br from-platform-accent/5 to-platform-cyan/5 border-platform-accent">
        <Label className="text-lg font-semibold mb-4 flex items-center gap-2 text-platform-contrast">
          <Calculator className="h-5 w-5" />
          Your Tax Calculation
        </Label>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            key={taxLiability}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center p-4 bg-white/50 rounded-lg"
          >
            <div className="text-2xl font-bold text-platform-accent">
              ${fmtShort(taxLiability)}
            </div>
            <div className="text-platform-contrast text-xs">Annual Tax</div>
          </motion.div>
          
          <div className="text-center p-4 bg-white/30 rounded-lg">
            <div className="text-lg font-semibold text-platform-contrast">
              ${fmtShort(monthlyTax)}
            </div>
            <div className="text-platform-contrast text-xs">Monthly</div>
          </div>
          
          <div className="text-center p-4 bg-white/30 rounded-lg">
            <div className="text-lg font-semibold text-platform-contrast">
              ${dailyTax.toFixed(2)}
            </div>
            <div className="text-platform-contrast text-xs">Daily</div>
          </div>
          
          <div className="text-center p-4 bg-white/30 rounded-lg">
            <div className="text-lg font-semibold text-platform-contrast">
              ${hourlyTax.toFixed(2)}
            </div>
            <div className="text-platform-contrast text-xs">Per Hour</div>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="mt-6 pt-4 border-t border-platform-contrast">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1 text-platform-contrast">
            <Sparkles className="h-4 w-4" />
            Quick Facts About Your Contribution
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-platform-contrast">
            <div className="flex items-center gap-2">
              <span className="text-platform-accent">•</span>
              Your taxes could fund about {Math.floor(taxLiability / 50000)} teacher salaries
            </div>
            <div className="flex items-center gap-2">
              <span className="text-platform-accent">•</span>
              Equivalent to {Math.floor(taxLiability / 1000)} miles of highway maintenance
            </div>
          </div>
        </div>
      </Card>

      {/* Call to Action */}
      <Card className="p-6 bg-gradient-to-r from-platform-cyan/10 to-platform-fuchsia/10 border-platform-cyan">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1 text-platform-contrast">Ready to explore?</h3>
            <p className="text-platform-contrast text-sm">
              See exactly where your ${fmtShort(taxLiability)} goes in the federal budget
            </p>
          </div>
          <Button className="bg-platform-accent hover:bg-platform-accent/90 text-white border border-platform-accent">
            <TrendingUp className="h-4 w-4 mr-2" />
            Explore Budget
          </Button>
        </div>
      </Card>
    </div>
  );
}