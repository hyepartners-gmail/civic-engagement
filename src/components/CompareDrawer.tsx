import { useUi } from '@/contexts/UiContext';
import { useBudgetData } from '@/hooks/useBudgetData';
import { selectTotals } from '@/selectors/budgetSelectors';
import { fmtShort } from '@/utils/number';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import AnimatedKpiValue from './AnimatedKpiValue';

export default function CompareDrawer() {
  const { pinnedTerms, unpinTerm, mode } = useUi();
  const { rollup, macro } = useBudgetData();

  if (pinnedTerms.length === 0 || !rollup || !macro) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-platform-card-background border-t-2 border-platform-accent z-50 shadow-2xl">
      <div className="mx-auto max-w-7xl p-4">
        <h2 className="text-lg font-thin mb-4">Term Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pinnedTerms.map((term) => {
            const startTotals = selectTotals(rollup, macro, term.startFY, mode);
            const endTotals = selectTotals(rollup, macro, term.endFY, mode);

            return (
              <div key={term.startFY} className="bg-platform-contrast p-4 rounded-lg relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => unpinTerm(term.startFY)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <h3 className="font-bold text-platform-accent">{term.president}</h3>
                <p className="text-xs font-mono">{term.startFY} - {term.endFY}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <KpiDelta label="Expenses" start={startTotals.outlays} end={endTotals.outlays} />
                  <KpiDelta label="Income" start={startTotals.receipts} end={endTotals.receipts} />
                  <KpiDelta label="Deficit" start={startTotals.deficit} end={endTotals.deficit} />
                  <KpiDelta label="Debt" start={startTotals.debt} end={endTotals.debt} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const KpiDelta = ({ label, start, end }: { label: string; start: number; end: number }) => {
  const delta = end - start;
  let deltaColor = delta > 0 ? 'text-red-400' : 'text-green-400';
  if (label === 'Income') {
    // Invert color for income
    deltaColor = delta > 0 ? 'text-green-400' : 'text-red-400';
  }

  return (
    <div className="flex justify-between items-baseline">
      <span className="text-platform-text/80">{label}</span>
      <div className="text-right">
        <span className={`font-mono ${deltaColor}`}>
          <AnimatedKpiValue startValue={start} endValue={end} formatter={fmtShort} />
        </span>
      </div>
    </div>
  );
};