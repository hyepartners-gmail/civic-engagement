"use client";
import { useUi } from '@/contexts/UiContext';
import { useHierarchy, ProcessedBudgetNode } from '@/hooks/useHierarchy';
import { colors } from '@/lib/theme';
import { useLab } from '@/contexts/LabContext';
import { scaleLinear } from 'd3-scale';
import { createSafeReactComponent } from '@/utils/reactSafety';

// Function to transform our tree data into the format Nivo expects
const transformDataForNivo = (node: ProcessedBudgetNode, year: number): any => {
  const value = node.values[year]?.nominal || 0;
  return {
    id: node.id,
    name: node.name,
    value: value > 0 ? value : 0, // Nivo requires non-negative values
    children: node.children.map(child => transformDataForNivo(child, year)),
  };
};

// Create the safe Sunburst component
const SafeSunburst = createSafeReactComponent(async () => {
  const { ResponsiveSunburst } = await import('@nivo/sunburst');
  
  return function SunburstChart() {
    const { year, selectedNodeId, setSelectedNodeId, highlightedNodeIds } = useUi();
    const { scenario } = useLab();
    const { root, isLoading } = useHierarchy();

    const { deltas } = scenario;

    // Color scales for impact overlay
    const greenScale = scaleLinear<string>().domain([0, 0.2]).range(["#A5D6A7", "#388E3C"]);
    const redScale = scaleLinear<string>().domain([-0.2, 0]).range(["#B71C1C", "#FFCDD2"]);

    if (isLoading || !root) {
      return <div className="w-full h-full rounded-full bg-platform-contrast animate-pulse" />;
    }

    const nivoData = transformDataForNivo(root, year);
    const isHighlighted = (id: string) => highlightedNodeIds.includes(id);

    return (
      <ResponsiveSunburst
        data={nivoData}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        id="id"
        value="value"
        cornerRadius={3}
        borderWidth={2}
        borderColor={d => {
          const delta = deltas[d.id as string] || 0;
          if (delta > 0) return '#4CAF50';
          if (delta < 0) return '#D32F2F';
          if (isHighlighted(d.id as string)) return colors.platform.cyan;
          return colors.platform.background;
        }}
        colors={d => {
          const delta = deltas[d.id as string] || 0;
          if (isHighlighted(d.id as string)) return colors.platform.cyan;
          if (delta > 0) return greenScale(delta);
          if (delta < 0) return redScale(delta);
          
          const defaultColors = [colors.platform.accent, colors.platform.fuchsia];
          return defaultColors[d.depth % defaultColors.length];
        }}
        childColor={{ from: 'color', modifiers: [['brighter', 0.4]] }}
        enableArcLabels={true}
        arcLabelsSkipAngle={12}
        arcLabelsTextColor={colors.platform.text}
        motionConfig="gentle"
        transitionMode="pushIn"
        onClick={(node) => setSelectedNodeId(node.id as string)}
        tooltip={({ datum }: any) => {
          const name = datum?.data?.name || datum?.name || datum?.id || 'Unknown';
          const value = datum?.value || 0;
          return (
            <div
              style={{
                background: colors.platform.contrast,
                color: colors.platform.text,
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <strong>{name}</strong>
              <br />
              Value: ${(value / 1000000000).toFixed(1)}B
              <br />
              ${(value / 1000000000).toFixed(1)}B of total expenses
            </div>
          );
        }}
        theme={{
          labels: { text: { fill: colors.platform.text, fontSize: 12 } },
        }}
      />
    );
  };
});

export default function Sunburst() {
  return (
    <SafeSunburst 
      fallback={
        <div className="w-full h-full rounded-full bg-platform-contrast animate-pulse flex items-center justify-center">
          <span className="text-platform-text/70">Loading sunburst chart...</span>
        </div>
      }
    />
  );
}