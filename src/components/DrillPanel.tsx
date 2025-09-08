import { useUi } from '@/contexts/UiContext';
import { useHierarchy, ProcessedBudgetNode } from '@/hooks/useHierarchy';
import { useBudgetData } from '@/hooks/useBudgetData';
import { selectTotals } from '@/selectors/budgetSelectors';
import { fmtShort, fmtPct } from '@/utils/number';
import { ChevronRight, Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';
import { chartLogger, logChartStart, logDataLoad } from '@/utils/chartLogger';
import { useChartReady } from '@/hooks/useChartReady';

const LineSmall = dynamic(() => import('@/charts/LineSmall'), { 
  ssr: false,
  loading: () => {
    chartLogger.log('DrillPanel', 'LINESMALL_LOADING');
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }
});

export default function DrillPanel({ isParentReady = true }: { isParentReady?: boolean }) {
  const { selectedNodeId, setSelectedNodeId, year, mode } = useUi();
  const { getPath, getNode } = useHierarchy();
  const { rollup, macro } = useBudgetData();
  const isChartReady = useChartReady([rollup, macro]);

  // Move this useMemo here, and make it safely handle node being null
  const allChildrenSparklineData = useMemo(() => {
    if (!selectedNodeId || !rollup || !rollup.years || !macro) {
      return new Map<string, { x: number; y: number }[]>();
    }
    const node = getNode(selectedNodeId); // Call getNode here, inside useMemo
    if (!node) {
      return new Map<string, { x: number; y: number }[]>();
    }

    const dataMap = new Map<string, { x: number; y: number }[]>();
    const years = Object.keys(rollup.years).map(Number).sort();
    const sparklineYears = years.slice(-20);

    node.children.forEach(child => {
      const sparklineData = sparklineYears.map(y => ({
        x: y,
        y: child.values[y]?.nominal || 0,
      }));
      dataMap.set(child.id, sparklineData);
    });
    return dataMap;
  }, [selectedNodeId, rollup, macro, year, getNode]); // Dependencies updated

  // Log component initialization
  useEffect(() => {
    logChartStart('DrillPanel', { selectedNodeId, year, mode });
  }, []);

  // Log data and selection changes
  useEffect(() => {
    logDataLoad('DrillPanel', {
      hasRollup: !!rollup,
      hasMacro: !!macro,
      selectedNodeId,
      year,
      mode,
      isChartReady,
      isParentReady
    });
  }, [rollup, macro, selectedNodeId, year, mode, isChartReady, isParentReady]);

  if (!selectedNodeId) {
    chartLogger.log('DrillPanel', 'NO_SELECTION');
    return (
      <div className="flex items-center justify-center h-full text-platform-text/70">
        <p>Click a section of the chart to see details.</p>
      </div>
    );
  }

  const node = getNode(selectedNodeId); // Call getNode again for rendering logic
  const path = getPath(selectedNodeId); // Declare path here

  if (!node || !rollup || !rollup.years || !macro) {
    chartLogger.log('DrillPanel', 'MISSING_DATA', {
      hasNode: !!node,
      hasRollup: !!rollup,
      hasRollupYears: !!(rollup?.years),
      hasMacro: !!macro,
      selectedNodeId
    });
    return null;
  }

  const totals = selectTotals(rollup, macro, year, 'nominal');
  const totalOutlays = totals.outlays;
  const netInterest = totals.netInterest;
  const nodeValue = node.values[year]?.nominal || 0;
  const pctOfTotal = totalOutlays > 0 ? nodeValue / totalOutlays : 0;
  const vsInterest = netInterest > 0 ? nodeValue / netInterest : 0;

  const years = Object.keys(rollup.years).map(Number).sort();
  const sparklineYears = years.slice(-20);

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-platform-text/80 mb-4 flex-wrap">
        {path.map((p, i) => (
          <span key={p.id} className="flex items-center">
            <button onClick={() => setSelectedNodeId(p.id)} className="hover:text-platform-accent">
              {p.name}
            </button>
            {i < path.length - 1 && <ChevronRight className="h-4 w-4 mx-1" />}
          </span>
        ))}
      </div>

      {/* Node Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-thin text-platform-accent">{node.name}</h2>
        <div className="flex items-baseline gap-4 mt-2">
          <span className="text-3xl font-bold">{fmtShort(nodeValue)}</span>
          <span className="text-lg text-platform-text/80">${(nodeValue / 1000000000).toFixed(1)}B of total expenses</span>
        </div>
        {node.id !== 'func:900' && netInterest > 0 && (
          <div className="mt-2 text-sm text-platform-cyan bg-platform-cyan/10 px-3 py-1 rounded-full inline-flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>This is <strong>{vsInterest.toFixed(1)}x</strong> the amount spent on Net Interest this year.</span>
          </div>
        )}
      </div>

      {/* Children List */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">Breakdown</h3>
        <div className="space-y-2">
          {node.children.length > 0 ? (
            node.children
              .sort((a, b) => (b.values[year]?.nominal || 0) - (a.values[year]?.nominal || 0))
              .map(child => {
                const childValue = child.values[year]?.nominal || 0;
                // --- FIX: Access pre-calculated sparklineData ---
                const sparklineData = allChildrenSparklineData.get(child.id) || [];
                // --- END FIX ---
                
                return (
                  <div
                    key={child.id}
                    onClick={() => setSelectedNodeId(child.id)}
                    className="p-3 bg-platform-contrast/50 rounded-lg cursor-pointer hover:bg-platform-contrast"
                  >
                    <div className="flex justify-between items-center">
                      <span className="flex-1 truncate">{child.name}</span>
                      <div className="w-24 h-8 ml-4">
                        {(() => {
                          chartLogger.log('DrillPanel', 'RENDERING_LINESMALL', {
                            childId: child.id,
                            sparklineDataLength: sparklineData.length
                          });
                          return <LineSmall data={sparklineData} isParentReady={isChartReady && isParentReady} />;
                        })()}
                      </div>
                      <span className="w-24 text-right font-mono">{fmtShort(childValue)}</span>
                    </div>
                  </div>
                );
              })
          ) : (
            <p className="text-sm text-platform-text/70">No further breakdown available.</p>
          )}
        </div>
      </div>
    </div>
  );
}