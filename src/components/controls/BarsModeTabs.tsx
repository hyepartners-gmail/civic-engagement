"use client";
import { useUrlState } from '@/hooks/useUrlState';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BarsModeTabsProps {
  mode: 'percap' | 'total';
  onModeChange: (mode: 'percap' | 'total') => void;
}

export default function BarsModeTabs({ mode, onModeChange }: BarsModeTabsProps) {
  const [urlMode, setUrlMode] = useUrlState<'percap' | 'total'>('mode', 'percap');

  const handleModeChange = (newMode: string) => {
    const mode = newMode as 'percap' | 'total';
    onModeChange(mode);
    setUrlMode(mode);
  };

  return (
    <Tabs value={mode} onValueChange={handleModeChange}>
      <TabsList>
        <TabsTrigger value="percap">Per-Capita</TabsTrigger>
        <TabsTrigger value="total">Total</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}