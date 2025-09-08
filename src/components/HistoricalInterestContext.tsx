"use client";
import { useBudgetData } from '@/hooks/useBudgetData';
import { selectTotals } from '@/selectors/budgetSelectors';
import { fmtPct } from '@/utils/number';
import dynamic from 'next/dynamic';

const LineSmall = dynamic(() => import('@/charts/LineSmall'), { ssr: false });

export default function HistoricalInterestContext() {
  const { rollup, macro } = useBudgetData();

  if (!rollup || !macro) return null;

  const years = Array.from({ length: 21 }, (_, i) => 1980 + i); // 1980-2000
  const data = years.map(year => {
    const totals = selectTotals(rollup, macro, year, '%GDP');
    return { x: year, y: totals.netInterest };
  }).filter(d => d.y > 0); // Filter out years with no data

  if (data.length === 0) return null;

  const peak = Math.max(...data.map(d => d.y));

  return (
    <div className="bg-platform-contrast/50 p-4 rounded-lg">
      <h4 className="font-semibold text-sm mb-2 text-platform-text">Historical Context: The 1980s</h4>
      <div className="flex gap-4 items-center">
        <div className="w-24 h-12">
          <LineSmall data={data} />
        </div>
        <p className="text-xs flex-1 text-platform-text">
          During the high-interest-rate environment of the 1980s, Net Interest on the debt peaked at <strong>{fmtPct(peak)} of GDP</strong>. Your current projection can be compared against this historical benchmark.
        </p>
      </div>
    </div>
  );
}