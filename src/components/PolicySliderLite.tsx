"use client";
import { useCallback, useState } from 'react';
import { useYou } from '@/contexts/YouContext';
import { useHierarchy, ProcessedBudgetNode } from '@/hooks/useHierarchy';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { fmtPct } from '@/utils/number';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const PRESETS = [
  { label: 'More Schools', selectedFunctionId: 'func:500', spendingDelta: 0.05, deltas: { 'func:500': 0.05 } },
  { label: 'Cheaper Debt', selectedFunctionId: 'func:900', spendingDelta: -0.10, deltas: { 'func:900': -0.10 } },
  { label: 'Smaller Pentagon', selectedFunctionId: 'func:050', spendingDelta: -0.10, deltas: { 'func:050': -0.10 } },
];

export default function PolicySliderLite() {
  const { scenario, setDeltas } = useYou();
  const { selectedFunctionId } = scenario;
  const { root, nodeMap } = useHierarchy();
  const [maxDepth, setMaxDepth] = useState(1);

  const handleDeltaChange = (funcId: string, value: number) => {
    setDeltas({
      deltas: {
        ...scenario.deltas,
        [funcId]: value,
      },
      spendingDelta: value,
    });
  };

  const getNestedOptions = useCallback(() => {
    if (!root || !nodeMap) return [];

    const options: { id: string; name: string; level: number }[] = [];

    const addNodes = (node: ProcessedBudgetNode, currentLevel: number) => {
      if (currentLevel > maxDepth) {
        return;
      }

      if (node.id !== 'root') {
        options.push({ id: node.id, name: node.name, level: currentLevel });
      }

      if (currentLevel < maxDepth) {
        const sortedChildren = [...node.children].sort((a, b) => a.name.localeCompare(b.name));
        sortedChildren.forEach(child => addNodes(child, currentLevel + 1));
      }
    };

    root.children.forEach(funcNode => addNodes(funcNode, 1));

    return options;
  }, [root, nodeMap, maxDepth]);

  const dropdownOptions = getNestedOptions();

  return (
    <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
      <h2 className="text-xl font-thin text-platform-text mb-4">What if...?</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="function-select">Budget Category</Label>
          <Select value={selectedFunctionId} onValueChange={(id) => setDeltas({ selectedFunctionId: id })}>
            <SelectTrigger className="bg-platform-contrast border-platform-accent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
              {dropdownOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <span style={{ marginLeft: `${(option.level - 1) * 16}px` }}>
                    {option.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dropdown Depth</Label>
          <RadioGroup
            value={String(maxDepth)}
            onValueChange={(value) => setMaxDepth(Number(value))}
            className="flex gap-4 mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="depth1" />
              <Label htmlFor="depth1">1st Level</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="depth2" />
              <Label htmlFor="depth2">2nd Level</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="depth3" />
              <Label htmlFor="depth3">3rd Level</Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Spending Change</Label>
            <span className="font-mono text-platform-accent">
              {fmtPct(scenario.deltas[selectedFunctionId] || 0)}
            </span>
          </div>
          <Slider
            value={[scenario.deltas[selectedFunctionId] || 0]}
            onValueChange={([v]) => handleDeltaChange(selectedFunctionId, v)}
            min={-0.2}
            max={0.2}
            step={0.01}
          />
        </div>
        <div>
          <Label>Quick Presets</Label>
          <div className="grid grid-cols-3 gap-2 mt-2 overflow-hidden">
            {PRESETS.map(p => (
              <Button 
                key={p.label} 
                variant="outline" 
                size="sm" 
                className="border-platform-accent text-platform-accent hover:bg-platform-accent hover:text-white text-xs"
                onClick={() => setDeltas({
                  selectedFunctionId: p.selectedFunctionId,
                  spendingDelta: p.spendingDelta,
                  deltas: Object.fromEntries(
                    Object.entries(p.deltas).filter(([, value]) => value !== undefined)
                  ) as Record<string, number>
                })}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}