"use client";
import { useTax } from '@/contexts/TaxContext';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { fmtPct, fmtShort } from '@/utils/number';
import { motion } from 'framer-motion';

export default function TaxToggleCards() {
  const { policy, setPolicy } = useTax();
  const altTaxes = policy.altTaxes || {
    vat: { rate: 0, basePct: 0.5 },
    wealth: { threshold: 1_000_000_000, rate: 0 },
    carbon: { ratePerTon: 0, coveragePct: 0.5, dividendPct: 0 },
  };

  const handleVatChange = (value: number) => {
    setPolicy({ ...policy, altTaxes: { ...altTaxes, vat: { ...altTaxes.vat, rate: value, basePct: altTaxes.vat?.basePct || 0 } } });
  };

  const handleWealthChange = (value: number) => {
    setPolicy({ ...policy, altTaxes: { ...altTaxes, wealth: { ...altTaxes.wealth, rate: value, threshold: altTaxes.wealth?.threshold || 0 } } });
  };

  const handleCarbonChange = (value: number) => {
    setPolicy({ ...policy, altTaxes: { ...altTaxes, carbon: { ...altTaxes.carbon, ratePerTon: value, coveragePct: altTaxes.carbon?.coveragePct || 0 } } });
  };

  return (
    <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
      <h3 className="text-lg font-semibold mb-4 text-platform-text">Alternative Taxes</h3>
      <div className="space-y-6">
        <TaxCard
          title="Value-Added Tax (VAT)"
          description="A broad consumption tax."
          value={altTaxes.vat?.rate || 0}
          onValueChange={handleVatChange}
          formatter={fmtPct}
          min={0}
          max={0.15}
          step={0.005}
        />
        <TaxCard
          title="Wealth Tax"
          description="Annual tax on extreme wealth."
          value={altTaxes.wealth?.rate || 0}
          onValueChange={handleWealthChange}
          formatter={fmtPct}
          min={0}
          max={0.05}
          step={0.001}
        />
        <TaxCard
          title="Carbon Fee"
          description="Tax on CO2 emissions."
          value={altTaxes.carbon?.ratePerTon || 0}
          onValueChange={handleCarbonChange}
          formatter={(v) => `${fmtShort(v)}/ton`}
          min={0}
          max={100}
          step={5}
        />
      </div>
    </div>
  );
}

interface TaxCardProps {
  title: string;
  description: string;
  value: number;
  onValueChange: (value: number) => void;
  formatter: (value: number) => string;
  min: number;
  max: number;
  step: number;
}

const TaxCard = ({ title, description, value, onValueChange, formatter, min, max, step }: TaxCardProps) => (
  <motion.div layout className="bg-platform-contrast/50 p-4 rounded-md">
    <div className="flex justify-between items-center mb-2">
      <div>
        <h4 className="font-medium text-platform-text">{title}</h4>
        <p className="text-xs text-platform-text/70">{description}</p>
      </div>
      <span className="font-mono text-platform-accent">{formatter(value)}</span>
    </div>
    <Slider
      value={[value]}
      onValueChange={([v]) => onValueChange(v)}
      min={min}
      max={max}
      step={step}
    />
  </motion.div>
);