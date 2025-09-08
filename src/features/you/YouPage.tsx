"use client";
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import PersonalizerForm from '@/components/PersonalizerForm';
import ReceiptCard from '@/components/ReceiptCard';
import { useYou } from '@/contexts/YouContext';
import { usePersonalTax } from '@/hooks/usePersonalTax';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useHierarchy, ProcessedBudgetNode } from '@/hooks/useHierarchy';
import { useUi } from '@/contexts/UiContext';
import PolicySliderLite from '@/components/PolicySliderLite';
import { fmtShort } from '@/utils/number';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BudgetNavigation from '@/components/BudgetNavigation';
import { useTax } from '@/contexts/TaxContext';
import InteractiveTaxCalculator from '@/components/InteractiveTaxCalculator';
import TaxReceiptBuilder from '@/components/TaxReceiptBuilder';
import PolicyImpactSimulator from '@/components/PolicyImpactSimulator';
import { motion } from 'framer-motion';

const Treemap = dynamic(() => import('@/charts/Treemap'), { ssr: false });
const StoryMode = dynamic(() => import('@/components/StoryMode'), { ssr: false });

// Function to transform our tree data for the treemap, but with user's allocated tax
const transformDataForUser = (
  node: ProcessedBudgetNode,
  userTaxAllocation: Record<string, number>,
  year: number,
  showUserAllocation: boolean
): any => {
  const originalValue = node.values[year]?.nominal || 0;
  const userAllocatedValue = userTaxAllocation[node.id] || 0;

  const value = showUserAllocation ? userAllocatedValue : originalValue;

  return {
    id: node.id,
    name: node.name,
    value: value > 0 ? value : 0, // Nivo requires non-negative values
    children: node.children.map(child =>
      transformDataForUser(child, userTaxAllocation, year, showUserAllocation)
    ),
  };
};

export default function YouPage() {
  const { scenario } = useYou();
  const { input } = scenario;
  const { policy } = useTax(); // Get the current policy from TaxContext
  const { root } = useHierarchy();
  const { year } = useUi();

  const [showUserAllocation, setShowUserAllocation] = useState(true);

  // Pass the current policy to usePersonalTax
  const { total: personalTaxLiability } = usePersonalTax(input, policy);

  const userTaxAllocation = useMemo(() => {
    if (!root || personalTaxLiability === 0) return {};

    const allocation: Record<string, number> = {};
    const totalFederalSpending = root.values[year]?.nominal || 0;

    if (totalFederalSpending === 0) return {};

    const allocate = (node: ProcessedBudgetNode) => {
      const nodeSpending = node.values[year]?.nominal || 0;
      const proportionOfTotal = nodeSpending / totalFederalSpending;
      const allocatedToNode = personalTaxLiability * proportionOfTotal;
      allocation[node.id] = allocatedToNode;
      node.children.forEach(allocate);
    };

    allocate(root);
    return allocation;
  }, [root, personalTaxLiability, year]);

  const treemapData = useMemo(() => {
    if (!root) return null;
    return transformDataForUser(root, userTaxAllocation, year, showUserAllocation);
  }, [root, userTaxAllocation, year, showUserAllocation]); // Memoize treemapData

  const topCategories = useMemo(() => {
    if (!root || personalTaxLiability === 0) return [];
    return root.children
      .map(node => ({
        name: node.name,
        value: userTaxAllocation[node.id] || 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [root, userTaxAllocation, personalTaxLiability]);

  return (
    <div className="space-y-8">
      <BudgetNavigation />
      
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center bg-gradient-to-r from-platform-accent/10 via-platform-cyan/10 to-platform-fuchsia/10 p-8 rounded-xl border border-platform-accent/20"
      >
        <h1 className="text-4xl font-bold text-platform-text mb-4">
          Your Personal Tax Story
        </h1>
        <p className="text-xl text-platform-text/80 max-w-2xl mx-auto">
          Discover how your tax dollars fund America's operations. Get your personalized receipt, 
          explore policy impacts, and understand your role in the federal budget.
        </p>
      </motion.div>

      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator">💰 Calculate</TabsTrigger>
          <TabsTrigger value="receipt">🧾 Receipt</TabsTrigger>
          <TabsTrigger value="explore">🗺️ Explore</TabsTrigger>
          <TabsTrigger value="simulate">🔬 Simulate</TabsTrigger>
        </TabsList>

        {/* Tab 1: Interactive Calculator */}
        <TabsContent value="calculator" className="space-y-6">
          <InteractiveTaxCalculator />
        </TabsContent>

        {/* Tab 2: Receipt Builder */}
        <TabsContent value="receipt" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <TaxReceiptBuilder 
                year={year}
                totalTax={personalTaxLiability}
                topCategories={topCategories}
              />
            </div>
            <div className="space-y-6">
              <ReceiptCard
                year={year}
                totalTax={personalTaxLiability}
                topCategories={topCategories}
              />
              <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast">
                <h4 className="font-semibold mb-2">Quick Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Daily contribution:</span>
                    <span className="font-mono">${(personalTaxLiability / 365).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hourly contribution:</span>
                    <span className="font-mono">${(personalTaxLiability / (365 * 8)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Top category:</span>
                    <span className="text-platform-accent">{topCategories[0]?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Interactive Exploration */}
        <TabsContent value="explore" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
                <h3 className="text-lg font-semibold mb-4">Visualization Mode</h3>
                <div className="flex items-center justify-between mb-4">
                  <Label htmlFor="show-user-allocation">Show My Personal Allocation</Label>
                  <Switch
                    id="show-user-allocation"
                    checked={showUserAllocation}
                    onCheckedChange={setShowUserAllocation}
                  />
                </div>
                <p className="text-sm text-platform-text/70">
                  {showUserAllocation 
                    ? "Viewing your personal tax allocation based on your income"
                    : "Viewing the full federal budget breakdown"
                  }
                </p>
              </div>
              
              <PolicySliderLite />
              
              <div className="bg-platform-contrast/10 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-platform-accent">💡 Pro Tip</h4>
                <p className="text-sm text-platform-text/80">
                  Click on sections of the treemap to drill down and see where your tax dollars 
                  are allocated within each government function.
                </p>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
                <h2 className="text-xl font-thin text-platform-text mb-4">
                  {showUserAllocation ? 'Your Tax Allocation' : 'Federal Budget Breakdown'}
                </h2>
                <div className="h-[600px]">
                  {treemapData ? (
                    <Treemap data={treemapData} />
                  ) : (
                    <div className="animate-pulse bg-platform-contrast h-full rounded-lg flex items-center justify-center">
                      <span className="text-platform-text/70">Loading visualization...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Policy Simulator */}
        <TabsContent value="simulate" className="space-y-6">
          <PolicyImpactSimulator />
        </TabsContent>
      </Tabs>
      
      {/* Data Stories */}
      <div className="bg-platform-card-background rounded-xl border border-platform-contrast">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-platform-text mb-2">Your Tax Dollar Stories</h2>
          <p className="text-platform-text/70">
            Scroll through interactive stories that explain how your personal tax contribution 
            supports different aspects of American government and society.
          </p>
        </div>
        <StoryMode year={year} />
      </div>
    </div>
  );
}