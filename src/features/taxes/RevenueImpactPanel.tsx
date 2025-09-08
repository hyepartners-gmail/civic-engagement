import { fmtShort, fmtPct } from '@/utils/number';
import { TrendingUp, TrendingDown } from 'lucide-react'; // Import TrendingDown

interface RevenueImpactPanelProps {
  annualDelta: number;
  cumulativeDelta: number;
  gdp: number;
}

export default function RevenueImpactPanel({ annualDelta, cumulativeDelta, gdp }: RevenueImpactPanelProps) {
  const annualPctGdp = gdp > 0 ? annualDelta / gdp : 0;
  const isPositive = annualDelta > 0;
  const color = isPositive ? 'text-green-400' : 'text-red-400';
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
      <h3 className="text-lg font-semibold mb-4 text-platform-text">Revenue Impact</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-platform-text/80">Annual Change</span>
          <span className={`flex items-center gap-2 font-bold text-2xl ${color}`}>
            <Icon className="h-6 w-6" />
            {fmtShort(annualDelta)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-platform-text/80">as % of GDP</span>
          <span className={`font-mono ${color}`}>{fmtPct(annualPctGdp)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-platform-text/80">10-Year Cumulative</span>
          <span className={`font-mono ${color}`}>{fmtShort(cumulativeDelta)}</span>
        </div>
      </div>
    </div>
  );
}