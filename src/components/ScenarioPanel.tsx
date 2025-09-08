"use client";
import { useState, useMemo } from 'react';
import { useLab } from '@/contexts/LabContext';
import { useHierarchy } from '@/hooks/useHierarchy';
import { useBudgetData } from '@/hooks/useBudgetData';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { fmtPct, fmtShort } from '@/utils/number';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  RotateCcw, PlusCircle, Trash2, Share2, AlertTriangle, 
  TrendingUp, TrendingDown, Swords, GraduationCap, Heart, 
  Building, TreePine, Users, DollarSign, Info 
} from 'lucide-react';
import AddProgramModal from './AddProgramModal';
import PlatformCard from './PlatformCard';
import { useToast } from '@/hooks/use-toast';
import ScenarioHistory from './ScenarioHistory';
import ScenarioSharing from './ScenarioSharing';
import { motion, AnimatePresence } from 'framer-motion';

// Budget function categories for better organization
const FUNCTION_CATEGORIES = {
  defense: {
    name: 'Defense & Security',
    icon: Swords,
    color: 'border-red-500/30 bg-red-500/5',
    functions: ['func:050', 'func:700'] // National Defense, Veterans
  },
  social: {
    name: 'Social Programs',
    icon: Heart,
    color: 'border-blue-500/30 bg-blue-500/5',
    functions: ['func:600', 'func:550', 'func:570'] // Income Security, Health, Medicare
  },
  education: {
    name: 'Education & Science',
    icon: GraduationCap,
    color: 'border-purple-500/30 bg-purple-500/5',
    functions: ['func:500', 'func:250'] // Education, Science
  },
  infrastructure: {
    name: 'Infrastructure & Commerce',
    icon: Building,
    color: 'border-orange-500/30 bg-orange-500/5',
    functions: ['func:400', 'func:370', 'func:450'] // Transportation, Commerce, Community
  },
  environment: {
    name: 'Environment & Energy',
    icon: TreePine,
    color: 'border-green-500/30 bg-green-500/5',
    functions: ['func:300', 'func:270'] // Natural Resources, Energy
  },
  government: {
    name: 'Government Operations',
    icon: Users,
    color: 'border-gray-500/30 bg-gray-500/5',
    functions: ['func:800', 'func:900', 'func:750'] // General Gov, Interest, Admin
  }
};

const WASTE_PRESETS = [
  { name: 'Trim F-35 Program', amount: 10, functionId: 'func:050', description: 'Reduce acquisition of F-35 fighter jets.' },
  { name: 'End "Ghost" Contracts', amount: 15, functionId: 'func:800', description: 'Cancel contracts for unneeded services.' },
  { name: 'Reduce Farm Subsidies', amount: 20, functionId: 'func:350', description: 'Lower payments to large agricultural firms.' },
];

// Budget Impact Calculator Component
const BudgetImpactPreview = ({ scenario, rollup }: { scenario: any, rollup: any }) => {
  const currentYear = new Date().getFullYear() - 1;
  const yearData = rollup?.years?.[currentYear];
  
  if (!yearData) return null;

  const totalDeltaImpact = Object.entries(scenario.deltas || {}).reduce((total, [funcId, delta]) => {
    // Rough estimation - in reality this would use actual function spending data
    const estimatedFunctionSpending = yearData.outlays * 0.1; // Simplified
    return total + (estimatedFunctionSpending * (delta as number));
  }, 0);

  const customProgramsImpact = (scenario.customPrograms || []).reduce((total: number, program: any) => {
    return total + (program.type === 'spending' ? program.amount * 1e9 : -program.amount * 1e9);
  }, 0);

  const totalImpact = totalDeltaImpact + customProgramsImpact;
  const newOutlays = yearData.outlays + totalImpact;
  const newDeficit = newOutlays - yearData.receipts;
  const deficitChange = newDeficit - yearData.deficit;

  return (
    <div className="bg-platform-contrast/20 p-4 rounded-lg space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="h-4 w-4 text-platform-accent" />
        <span className="text-sm font-semibold text-platform-text">Budget Impact Preview</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className={`p-2 rounded ${totalImpact > 0 ? 'bg-red-500/10 text-red-400' : totalImpact < 0 ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
          <div className="font-semibold">Spending Change</div>
          <div className="font-mono">
            {totalImpact > 0 ? '+' : ''}{fmtShort(totalImpact)}
          </div>
        </div>
        
        <div className={`p-2 rounded ${deficitChange > 0 ? 'bg-red-500/10 text-red-400' : deficitChange < 0 ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
          <div className="font-semibold">Deficit Impact</div>
          <div className="font-mono">
            {deficitChange > 0 ? '+' : ''}{fmtShort(deficitChange)}
          </div>
        </div>
      </div>
      
      {Math.abs(totalImpact) > yearData.outlays * 0.1 && (
        <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 p-2 rounded">
          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>This represents a significant budget change. Consider economic impacts.</span>
        </div>
      )}
    </div>
  );
};


// Category-based spending controls
const CategorySpendingPanel = ({ scenario, functions, onDeltaChange }: {
  scenario: any;
  functions: any[];
  onDeltaChange: (funcId: string, value: number) => void;
}) => {
  return (
    <div className="space-y-6">
      {Object.entries(FUNCTION_CATEGORIES).map(([categoryKey, category]) => {
        const categoryFunctions = functions.filter(func => 
          category.functions.includes(func.id)
        );
        
        if (categoryFunctions.length === 0) return null;
        
        const IconComponent = category.icon;
        const totalCategoryChange = categoryFunctions.reduce((sum, func) => 
          sum + Math.abs(scenario.deltas[func.id] || 0), 0
        );
        
        return (
          <motion.div
            key={categoryKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border rounded-lg p-4 ${category.color}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <IconComponent className="h-5 w-5" />
              <h3 className="font-semibold text-platform-text">{category.name}</h3>
              {totalCategoryChange > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {totalCategoryChange > 0.1 ? 'Major Changes' : 'Minor Changes'}
                </Badge>
              )}
            </div>
            
            <div className="space-y-4">
              {categoryFunctions.map((func: any) => {
                const currentDelta = scenario.deltas[func.id] || 0;
                return (
                  <div key={func.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">{func.name}</Label>
                      <div className="flex items-center gap-2">
                        {currentDelta !== 0 && (
                          <span className={`text-xs font-mono px-2 py-1 rounded ${
                            currentDelta > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {currentDelta > 0 ? '+' : ''}{fmtPct(currentDelta)}
                          </span>
                        )}
                        {Math.abs(currentDelta) > 0.15 && (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                    </div>
                    
                    <Slider
                      value={[currentDelta]}
                      onValueChange={([v]) => onDeltaChange(func.id, v)}
                      min={-0.3}
                      max={0.3}
                      step={0.01}
                      className="w-full"
                    />
                    
                    <div className="flex justify-between text-xs text-platform-text/60">
                      <span>-30% Cut</span>
                      <span>No Change</span>
                      <span>+30% Increase</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const CutWastePanel = () => {
  const { addCustomProgram } = useLab();
  const { toast } = useToast();

  const handleCut = (wasteItem: typeof WASTE_PRESETS[0]) => {
    addCustomProgram({
      name: `Cut: ${wasteItem.name}`,
      type: 'revenue', // A cut is treated as revenue
      amount: wasteItem.amount,
      functionId: wasteItem.functionId,
    });
    toast({ title: 'Waste Cut Applied', description: `Reduced spending by ${fmtShort(wasteItem.amount * 1e9)}.` });
  };

  return (
    <div>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Trash2 className="h-4 w-4" />
        Quick Savings Ideas
      </h3>
      <div className="space-y-2">
        {WASTE_PRESETS.map(item => (
          <PlatformCard key={item.name} className="p-3 hover:bg-platform-contrast/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-platform-text">{item.name}</p>
                <p className="text-xs text-platform-text/70">{item.description}</p>
              </div>
              <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => handleCut(item)}>
                Save {fmtShort(item.amount * 1e9)}
              </Button>
            </div>
          </PlatformCard>
        ))}
      </div>
      
      <div className="mt-3 p-2 bg-platform-accent/10 rounded text-xs text-platform-text/70">
        <Info className="h-3 w-3 inline mr-1" />
        These are examples of commonly proposed spending cuts
      </div>
    </div>
  );
};

export default function ScenarioPanel() {
  const { scenario, setScenario, resetScenario, removeCustomProgram } = useLab();
  const { root } = useHierarchy();
  const { rollup } = useBudgetData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('spending');
  const { toast } = useToast();

  if (!root) return <div className="animate-pulse bg-platform-contrast h-full rounded-lg" />;

  const functions = (root as any).children?.filter((c: any) => c.kind === 'function') || [];

  const handleDeltaChange = (funcId: string, value: number) => {
    setScenario({
      ...scenario,
      deltas: {
        ...scenario.deltas,
        [funcId]: value,
      },
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link Copied!', description: 'Scenario URL copied to clipboard.' });
  };

  const hasChanges = Object.keys(scenario.deltas).length > 0 || (scenario.customPrograms && scenario.customPrograms.length > 0);
  const totalProgramImpact = (scenario.customPrograms || []).reduce((sum: number, p: any) => 
    sum + (p.type === 'spending' ? p.amount : -p.amount), 0
  );

  return (
    <div className="bg-platform-card-background rounded-lg border border-platform-contrast h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-platform-contrast">
        <div>
          <h2 className="text-2xl font-bold text-platform-text flex items-center gap-2">
            <Swords className="h-6 w-6 text-platform-accent" />
            Policy Controls
          </h2>
          <p className="text-sm text-platform-text/70 mt-1">
            Adjust spending levels and add programs to see fiscal impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="bg-platform-accent/20 text-platform-accent">
              {Object.keys(scenario.deltas).length} changes
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Share Scenario">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={resetScenario} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Impact Preview - Always Visible */}
      <div className="p-4 border-b border-platform-contrast">
        <BudgetImpactPreview scenario={scenario} rollup={rollup} />
      </div>

      {/* Main Content with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mx-4 mt-4">
            <TabsTrigger value="spending" className="text-xs">
              <Building className="h-3 w-3 mr-1" />
              Spending
            </TabsTrigger>
            <TabsTrigger value="programs" className="text-xs">
              <PlusCircle className="h-3 w-3 mr-1" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="savings" className="text-xs">
              <Trash2 className="h-3 w-3 mr-1" />
              Savings
            </TabsTrigger>
            <TabsTrigger value="share" className="text-xs">
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="spending" className="mt-0 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-platform-text">Budget Categories</h3>
                <CategorySpendingPanel 
                  scenario={scenario}
                  functions={functions}
                  onDeltaChange={handleDeltaChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="programs" className="mt-0 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-platform-text flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Custom Programs
                </h3>
                <div className="space-y-3 mb-4">
                  {scenario.customPrograms && scenario.customPrograms.length > 0 ? (
                    scenario.customPrograms.map((program: any) => (
                      <motion.div 
                        key={program.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between bg-platform-contrast/50 p-3 rounded-lg"
                      >
                        <div className="flex-1">
                          <span className="font-medium text-platform-text">{program.name}</span>
                          <div className="text-xs text-platform-text/60 mt-1">
                            {program.type === 'spending' ? 'New Spending' : 'Revenue/Savings'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-sm px-2 py-1 rounded ${
                            program.type === 'revenue' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {program.type === 'revenue' ? '+' : '-'}{fmtShort(program.amount * 1e9)}
                          </span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeCustomProgram(program.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-platform-text/50">
                      <PlusCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No custom programs added yet.</p>
                      <p className="text-xs mt-1">Add new spending programs or revenue sources.</p>
                    </div>
                  )}
                </div>
                
                {totalProgramImpact !== 0 && (
                  <div className={`p-3 rounded-lg mb-4 ${
                    totalProgramImpact > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'
                  }`}>
                    <div className="text-sm font-semibold">
                      Total Program Impact: 
                      <span className={totalProgramImpact > 0 ? 'text-red-400' : 'text-green-400'}>
                        {totalProgramImpact > 0 ? '+' : ''}{fmtShort(totalProgramImpact * 1e9)}
                      </span>
                    </div>
                  </div>
                )}
                
                <Button 
                  className="w-full bg-platform-accent hover:bg-platform-accent/90 text-white" 
                  onClick={() => setIsModalOpen(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add New Program
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="savings" className="mt-0">
              <CutWastePanel />
            </TabsContent>

            <TabsContent value="share" className="mt-0">
              <ScenarioSharing />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-platform-text">Recent Scenarios</h3>
                <ScenarioHistory />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      <AddProgramModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}