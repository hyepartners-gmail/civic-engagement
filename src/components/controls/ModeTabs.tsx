"use client";

import { useUrlState } from '@/hooks/useUrlState';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModeTabsProps {
  mode: 'total' | 'percap';
  onModeChange: (mode: 'total' | 'percap') => void;
}

export default function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  const [urlMode, setUrlMode] = useUrlState<'total' | 'percap'>('costMode', 'total');

  const handleModeChange = (newMode: string) => {
    const mode = newMode as 'total' | 'percap';
    onModeChange(mode);
    setUrlMode(mode);
  };

  return (
    <Tabs value={mode} onValueChange={handleModeChange}>
      <TabsList>
        <TabsTrigger value="total">Total $</TabsTrigger>
        <TabsTrigger value="percap">Per-capita $</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}