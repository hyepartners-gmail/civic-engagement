"use client";
import { useBudgetData } from '@/hooks/useBudgetData';
import { useUi } from '@/contexts/UiContext';
import { selectTotals } from '@/selectors/budgetSelectors';
import { fmtShort } from '@/utils/number';
import ChartCard from '@/components/charts/ChartCard';
import { PresidentTerm } from '@/types/budget'; // Import PresidentTerm

// Optional hero/intro story component.
export default function StoryIntro() {
  const { rollup, macro, terms } = useBudgetData();
  const { year } = useUi();

  if (!rollup || !macro || !terms) {
    return (
      <ChartCard title="Federal Budget Overview" subtitle="Loading budget data...">
        <div className="h-64 bg-platform-contrast/30 animate-pulse rounded-lg" />
      </ChartCard>
    );
  }

  const totals = selectTotals(rollup, macro, year, 'nominal');
  const currentTerm = terms.find((term: PresidentTerm) => year >= term.startFY && year <= term.endFY);
  
  const totalYears = Object.keys(rollup.years).length;
  const minYear = Math.min(...Object.keys(rollup.years).map(Number));
  const maxYear = Math.min(Math.max(...Object.keys(rollup.years).map(Number)), 2024); // Cap at 2024 since that's the last year with actual data

  return (
    <ChartCard 
      title="Welcome to the Federal Budget Explorer" 
      subtitle={`Understanding America's fiscal priorities from ${minYear} to ${maxYear}`}
    >
      <div className="grid gap-6 md:grid-cols-3 h-full">
        <div className="bg-gradient-to-br from-platform-accent/20 to-platform-cyan/20 p-6 rounded-lg">
          <h4 className="text-lg font-semibold mb-4 text-platform-accent">Current Year: {year}</h4>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-platform-text">{fmtShort(totals.outlays)}</div>
              <div className="text-sm text-platform-text/70">Total Spending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-platform-text">{fmtShort(totals.receipts)}</div>
              <div className="text-sm text-platform-text/70">Total Revenue</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${totals.deficit > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {totals.deficit > 0 ? '-' : '+'}{fmtShort(Math.abs(totals.deficit))}
              </div>
              <div className="text-sm text-platform-text/70">{totals.deficit > 0 ? 'Deficit' : 'Surplus'}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-platform-contrast/20 p-6 rounded-lg">
          <h4 className="text-lg font-semibold mb-4 text-platform-accent">Presidential Context</h4>
          {currentTerm ? (
            <div className="space-y-3">
              <div>
                <div className="text-xl font-bold text-platform-text">{currentTerm.president}</div>
                <div className="text-sm text-platform-text/70">{currentTerm.party} Party</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-platform-text">{currentTerm.startFY}-{currentTerm.endFY}</div>
                <div className="text-sm text-platform-text/70">Term Period</div>
              </div>
            </div>
          ) : (
            <div className="text-platform-text/70">No presidential data available for {year}</div>
          )}
        </div>
        
        <div className="bg-platform-contrast/20 p-6 rounded-lg">
          <h4 className="text-lg font-semibold mb-4 text-platform-accent">Data Coverage</h4>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-platform-text">{totalYears}</div>
              <div className="text-sm text-platform-text/70">Years of Data</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-platform-text">{minYear}-{maxYear}</div>
              <div className="text-sm text-platform-text/70">Time Span</div>
            </div>
            <div className="text-xs text-platform-text/60 mt-4">
              Explore spending patterns, deficits, and fiscal policy changes across multiple decades of federal budget data.
            </div>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}