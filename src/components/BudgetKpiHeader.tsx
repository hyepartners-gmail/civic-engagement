import { useUi } from '@/contexts/UiContext';
import { useBudgetData } from '@/hooks/useBudgetData';
import { selectTotals } from '@/selectors/budgetSelectors';
import { fmtShort, fmtPct } from '@/utils/number';
import RollingCounter from './RollingCounter';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Info } from 'lucide-react';

export default function BudgetKpiHeader() {
  const { year, mode } = useUi();
  const { rollup, macro } = useBudgetData();

  if (!rollup || !macro) return <div className="h-24 animate-pulse bg-platform-contrast rounded-lg" />;

  const totals = selectTotals(rollup, macro, year, mode);
  const isPctGdp = mode === '%GDP';

  const formatValue = (value: number) => {
    if (isPctGdp) {
      return fmtPct(value);
    }
    return fmtShort(value);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
      <KpiCard label="For Year" value={year.toString()} color="text-platform-accent" />
      <KpiCard label="Expenses" value={formatValue(totals.outlays)} />
      <KpiCard label="Income" value={formatValue(totals.receipts)} />
      <KpiCard label="Deficit" value={formatValue(totals.deficit)} color={totals.deficit > 0 ? 'text-red-400' : 'text-green-400'} />
      <KpiCard label="Net Interest" value={formatValue(totals.netInterest)} />
    </div>
  );
}

const KpiCard = ({ label, value, color, children }: { label: string; value?: string; color?: string; children?: React.ReactNode }) => (
  <div className="bg-platform-contrast p-4 rounded-lg">
    <h3 className="text-sm md:text-base text-platform-text/80">{label}</h3>
    {children ? (
      <div className={color}>{children}</div>
    ) : (
      <div className={`text-2xl md:text-3xl font-bold ${color || 'text-platform-text'}`}>
        {value}
      </div>
    )}
  </div>
);