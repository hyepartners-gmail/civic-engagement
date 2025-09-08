"use client";
import ScenarioPanel from '@/components/ScenarioPanel';
import Scoreboard from '@/components/Scoreboard';
import { useBudgetData } from '@/hooks/useBudgetData';
import PolicyScenarioCards from '@/components/PresetCards';
import FiscalImpactCalculator from '@/components/FiscalImpactCalculator';
import { useLabScenarioUrl } from '@/hooks/useLabScenarioUrl';
import BudgetNavigation from '@/components/BudgetNavigation';

export default function LabPage() {
  useLabScenarioUrl();

  return (
    <div className="space-y-8">
      <BudgetNavigation />
      
      {/* Main Lab Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ScenarioPanel />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Scoreboard />
          <FiscalImpactCalculator />
        </div>
      </div>
      
      <PolicyScenarioCards />
    </div>
  );
}