"use client";
import { useLab } from '@/contexts/LabContext';
import { useBudgetData } from '@/hooks/useBudgetData';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import PlatformCard from './PlatformCard';
import { motion } from 'framer-motion';
import { fmtShort } from '@/utils/number';
import { 
  Swords, TreePine, GraduationCap, Heart, DollarSign, 
  TrendingDown, Building, Users, Shield, Wrench 
} from 'lucide-react';

interface PolicyScenario {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  historicalContext: string;
  icon: React.ComponentType<any>;
  color: string;
  impactPreview: string;
  deltas: Record<string, number>;
  tags: string[];
}

const POLICY_SCENARIOS: PolicyScenario[] = [
  {
    id: 'cold-war-peak',
    name: 'Reagan Defense Buildup',
    subtitle: '1980s-Style Military Expansion',
    description: 'Massive defense spending increase, similar to the Reagan military buildup that helped end the Cold War.',
    historicalContext: 'In the 1980s, defense spending reached 6.2% of GDP as America modernized its military to compete with the Soviet Union.',
    icon: Swords,
    color: 'from-red-500 to-orange-600',
    impactPreview: 'Higher military spending, reduced domestic programs',
    deltas: {
      'func:050': 0.25, // National Defense +25%
      'func:250': 0.15, // General Science, Space, and Technology +15%
      'func:500': -0.10, // Education etc. -10%
      'func:600': -0.05, // Income Security -5%
    },
    tags: ['Defense', 'Military', 'Security']
  },
  {
    id: 'green-new-deal',
    name: 'Climate Infrastructure Revolution',
    subtitle: 'Massive Green Investment Program',
    description: 'Transform America with unprecedented investment in clean energy, transportation, and environmental protection.',
    historicalContext: 'Modeled after the scale of FDR\'s New Deal, but focused on climate change as the defining challenge of our time.',
    icon: TreePine,
    color: 'from-green-500 to-emerald-600',
    impactPreview: 'Huge infrastructure spending, environmental focus',
    deltas: {
      'func:300': 0.40, // Natural Resources +40%
      'func:400': 0.30, // Transportation +30%
      'func:270': 0.25, // Energy +25%
      'func:500': 0.15, // Education/Training +15%
      'func:050': -0.15, // Defense -15%
    },
    tags: ['Environment', 'Infrastructure', 'Climate']
  },
  {
    id: 'education-first',
    name: 'Education Moonshot',
    subtitle: 'America\'s Knowledge Economy Investment',
    description: 'Treat education like the national priority it should be - massive investment in schools, colleges, and job training.',
    historicalContext: 'When Sputnik launched in 1957, America responded with huge education investments. Time for Education Sputnik 2.0.',
    icon: GraduationCap,
    color: 'from-blue-500 to-indigo-600',
    impactPreview: 'Education focus, workforce development',
    deltas: {
      'func:500': 0.35, // Education, Training, Employment +35%
      'func:250': 0.20, // General Science, Space, and Technology +20%
      'func:800': 0.10, // General Government +10%
      'func:050': -0.10, // Defense -10%
      'func:900': -0.05, // Interest -5% (through efficiency)
    },
    tags: ['Education', 'Research', 'Innovation']
  },
  {
    id: 'healthcare-for-all',
    name: 'Healthcare Security Act',
    subtitle: 'Universal Healthcare Implementation',
    description: 'Guarantee healthcare as a right for all Americans through comprehensive federal health programs.',
    historicalContext: 'Every other developed nation provides universal healthcare. Time for America to join them.',
    icon: Heart,
    color: 'from-pink-500 to-rose-600',
    impactPreview: 'Universal healthcare, expanded coverage',
    deltas: {
      'func:550': 0.40, // Health +40%
      'func:570': 0.20, // Medicare +20%
      'func:600': 0.15, // Income Security +15%
      'func:050': -0.15, // Defense -15%
      'func:450': -0.10, // Community Development -10%
    },
    tags: ['Healthcare', 'Social Security', 'Universal Coverage']
  },
  {
    id: 'fiscal-discipline',
    name: 'Balanced Budget Amendment',
    subtitle: 'Serious Fiscal Responsibility',
    description: 'Dramatic spending cuts across the board to eliminate the deficit and start paying down the national debt.',
    historicalContext: 'Like the bipartisan deficit reduction efforts of the 1990s that created budget surpluses.',
    icon: TrendingDown,
    color: 'from-gray-600 to-slate-700',
    impactPreview: 'Reduced spending, deficit elimination',
    deltas: {
      'func:050': -0.20, // Defense -20%
      'func:500': -0.15, // Education -15%
      'func:400': -0.15, // Transportation -15%
      'func:300': -0.15, // Natural Resources -15%
      'func:250': -0.20, // Science -20%
      'func:450': -0.25, // Community Development -25%
      'func:370': -0.20, // Commerce -20%
      'func:800': -0.15, // General Government -15%
    },
    tags: ['Fiscal', 'Cuts', 'Deficit Reduction']
  },
  {
    id: 'infrastructure-rebuild',
    name: 'Infrastructure Renaissance',
    subtitle: 'Rebuild America\'s Foundation',
    description: 'Massive investment in roads, bridges, broadband, and the infrastructure that powers economic growth.',
    historicalContext: 'Like the Interstate Highway System of the 1950s, but for the 21st century economy.',
    icon: Building,
    color: 'from-amber-500 to-orange-600',
    impactPreview: 'Infrastructure focus, economic development',
    deltas: {
      'func:400': 0.35, // Transportation +35%
      'func:370': 0.25, // Commerce and Housing +25%
      'func:450': 0.20, // Community Development +20%
      'func:800': 0.15, // General Government +15%
      'func:050': -0.10, // Defense -10%
    },
    tags: ['Infrastructure', 'Transportation', 'Development']
  }
];

export default function PolicyScenarioCards() {
  const { setScenario, scenario } = useLab();
  const { rollup, macro } = useBudgetData();

  const applyScenario = (policyScenario: PolicyScenario) => {
    // Create a completely fresh scenario to ensure updates trigger properly
    const newScenario = {
      year: scenario.year,
      deltas: { ...policyScenario.deltas }, // Fresh copy of deltas
      customPrograms: [], // Reset custom programs when applying preset
    };
    setScenario(newScenario);
  };

  const calculateImpact = (deltas: Record<string, number>) => {
    if (!rollup?.years) return { spending: 0, deficit: 0 };
    const currentYear = new Date().getFullYear() - 1;
    const yearData = rollup.years[currentYear];
    if (!yearData) return { spending: 0, deficit: 0 };
    
    // Simplified impact calculation - would be more sophisticated in reality
    const totalChange = Object.values(deltas).reduce((sum, delta) => sum + Math.abs(delta), 0);
    const spendingImpact = yearData.outlays * totalChange * 0.1; // Rough estimate
    
    return {
      spending: spendingImpact,
      deficit: spendingImpact // Simplified
    };
  };

  return (
    <div className="mb-8">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-platform-text mb-2">Policy Sandbox</h2>
        <p className="text-platform-text/70 max-w-2xl mx-auto">
          Explore how different policy visions would reshape America's budget. Each scenario represents a 
          real policy direction with historical precedent. Click to see the fiscal impact.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {POLICY_SCENARIOS.map((policyScenario, index) => {
          const IconComponent = policyScenario.icon;
          const impact = calculateImpact(policyScenario.deltas);
          
          return (
            <motion.div 
              key={policyScenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group"
            >
              <PlatformCard className="h-full overflow-hidden border-2 border-transparent hover:border-platform-accent/50 transition-all duration-300">
                {/* Header with gradient background */}
                <div className={`bg-gradient-to-r ${policyScenario.color} p-6 text-white relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 opacity-10 bg-grid-white/10" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <IconComponent className="h-8 w-8" />
                      <div>
                        <h3 className="text-xl font-bold">{policyScenario.name}</h3>
                        <p className="text-white/90 text-sm">{policyScenario.subtitle}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-platform-text/90 mb-4 leading-relaxed">
                    {policyScenario.description}
                  </p>
                  
                  <div className="bg-platform-contrast/20 p-3 rounded-lg mb-4">
                    <div className="text-xs font-semibold text-platform-accent mb-1">HISTORICAL CONTEXT</div>
                    <p className="text-xs text-platform-text/70">{policyScenario.historicalContext}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {policyScenario.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Impact Preview */}
                  <div className="bg-platform-accent/10 p-3 rounded-lg mb-4">
                    <div className="text-xs font-semibold text-platform-accent mb-1">FISCAL IMPACT</div>
                    <p className="text-xs text-platform-text/80">{policyScenario.impactPreview}</p>
                    {impact.spending > 0 && (
                      <p className="text-xs text-platform-text/60 mt-1">
                        Est. {fmtShort(impact.spending)} budget change
                      </p>
                    )}
                  </div>

                  {/* Apply Button */}
                  <Button
                    className={`w-full bg-gradient-to-r ${policyScenario.color} hover:scale-105 transition-all duration-300 text-white border-0 shadow-lg group-hover:shadow-xl`}
                    onClick={() => applyScenario(policyScenario)}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Implement This Policy
                  </Button>
                </div>
              </PlatformCard>
            </motion.div>
          );
        })}
      </div>

      {/* Call to Action */}
      <div className="mt-8 text-center bg-platform-contrast/10 p-6 rounded-xl">
        <Users className="h-8 w-8 text-platform-accent mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-platform-text mb-2">Ready to Go Deeper?</h3>
        <p className="text-platform-text/70 text-sm max-w-xl mx-auto">
          These scenarios are starting points. Use the controls below to fine-tune spending levels, 
          add your own programs, and see exactly how your policy vision affects America's fiscal future.
        </p>
      </div>
    </div>
  );
}