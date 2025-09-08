"use client";
import { useMemo } from 'react';
import { usePersonalTax } from '@/hooks/usePersonalTax';
import { useYou } from '@/contexts/YouContext';
import { useTax } from '@/contexts/TaxContext';
import { useHierarchy } from '@/hooks/useHierarchy';
import { useUi } from '@/contexts/UiContext';
import { fmtShort } from '@/utils/number';
import { motion } from 'framer-motion';

interface PersonalTaxJourneyProps {
  highlightedCategory?: string;
}

export default function PersonalTaxJourney({ highlightedCategory }: PersonalTaxJourneyProps) {
  const { scenario } = useYou();
  const { input } = scenario;
  const { policy } = useTax();
  const { root } = useHierarchy();
  const { year } = useUi();
  const { total: personalTaxLiability } = usePersonalTax(input, policy);

  const taxJourneyData = useMemo(() => {
    if (!root || personalTaxLiability === 0) return [];

    const totalFederalSpending = root.values[year]?.nominal || 0;
    if (totalFederalSpending === 0) return [];

    return root.children.map(node => {
      const nodeSpending = node.values[year]?.nominal || 0;
      const proportionOfTotal = nodeSpending / totalFederalSpending;
      const allocatedToNode = personalTaxLiability * proportionOfTotal;
      
      // Get category icon and color
      const getCategoryVisuals = (nodeId: string) => {
        switch (nodeId) {
          case 'func:600': return { icon: '🛡️', color: 'bg-blue-500', name: 'Income Security' };
          case 'func:000': return { icon: '🛡️', color: 'bg-red-500', name: 'National Defense' };
          case 'func:900': return { icon: '💳', color: 'bg-orange-500', name: 'Interest on Debt' };
          case 'func:500': return { icon: '🎓', color: 'bg-green-500', name: 'Education' };
          case 'func:700': return { icon: '🏥', color: 'bg-purple-500', name: 'Veterans Affairs' };
          case 'func:550': return { icon: '🏥', color: 'bg-pink-500', name: 'Health' };
          case 'func:300': return { icon: '🌾', color: 'bg-yellow-500', name: 'Natural Resources' };
          case 'func:400': return { icon: '🚗', color: 'bg-indigo-500', name: 'Transportation' };
          default: return { icon: '🏛️', color: 'bg-gray-500', name: node.name };
        }
      };

      const visuals = getCategoryVisuals(node.id);
      
      return {
        id: node.id,
        name: visuals.name,
        icon: visuals.icon,
        color: visuals.color,
        yourContribution: allocatedToNode,
        totalSpending: nodeSpending,
        percentage: (proportionOfTotal * 100),
        isHighlighted: highlightedCategory === node.id
      };
    })
    .filter(item => item.yourContribution > 0)
    .sort((a, b) => b.yourContribution - a.yourContribution);
  }, [root, personalTaxLiability, year, highlightedCategory]);

  if (personalTaxLiability === 0 || taxJourneyData.length === 0) {
    return (
      <div className="bg-platform-contrast/20 p-8 rounded-xl text-center">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-platform-text/70">
          Enter your income information above to see where your tax dollars go!
        </p>
      </div>
    );
  }

  const totalVisibleContribution = taxJourneyData.reduce((sum, item) => sum + item.yourContribution, 0);

  return (
    <div className="space-y-6">
      {/* Personal Tax Summary */}
      <div className="bg-gradient-to-r from-platform-accent/20 to-platform-cyan/20 p-6 rounded-xl">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-platform-accent mb-2">Your {year} Tax Journey</h3>
          <div className="text-4xl font-bold text-platform-text">{fmtShort(personalTaxLiability)}</div>
          <div className="text-sm text-platform-text/70">Your estimated federal tax contribution</div>
        </div>
      </div>

      {/* Tax Dollar Flow */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-platform-text mb-4">Where Your Money Goes:</h4>
        
        {taxJourneyData.slice(0, 8).map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`
              relative overflow-hidden rounded-lg border-2 transition-all duration-300
              ${item.isHighlighted 
                ? 'border-platform-accent bg-platform-accent/10 shadow-lg scale-105' 
                : 'border-platform-contrast hover:border-platform-accent/50 bg-platform-card-background'
              }
            `}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-white text-xl
                    ${item.color}
                  `}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-platform-text">{item.name}</div>
                    <div className="text-xs text-platform-text/70">
                      {item.percentage.toFixed(1)}% of federal budget
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-platform-accent">
                    {fmtShort(item.yourContribution)}
                  </div>
                  <div className="text-xs text-platform-text/70">
                    from your taxes
                  </div>
                </div>
              </div>
              
              {/* Progress bar showing relative contribution */}
              <div className="mt-3">
                <div className="h-2 bg-platform-contrast/30 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} transition-all duration-1000 ease-out`}
                    style={{ 
                      width: `${(item.yourContribution / taxJourneyData[0].yourContribution) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Highlight pulse animation */}
            {item.isHighlighted && (
              <motion.div
                className="absolute inset-0 bg-platform-accent/5 pointer-events-none"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-platform-contrast/20 p-4 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          <div>
            <div className="text-lg font-bold text-platform-accent">{taxJourneyData.length}</div>
            <div className="text-platform-text/70">Categories Funded</div>
          </div>
          <div>
            <div className="text-lg font-bold text-platform-accent">
              {fmtShort(totalVisibleContribution)}
            </div>
            <div className="text-platform-text/70">Total Allocated</div>
          </div>
          <div>
            <div className="text-lg font-bold text-platform-accent">
              ${(personalTaxLiability / 365).toFixed(2)}
            </div>
            <div className="text-platform-text/70">Per Day</div>
          </div>
          <div>
            <div className="text-lg font-bold text-platform-accent">
              ${(personalTaxLiability / (365 * 24)).toFixed(2)}
            </div>
            <div className="text-platform-text/70">Per Hour</div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-platform-cyan/10 to-platform-fuchsia/10 p-6 rounded-xl text-center">
        <p className="text-sm text-platform-text/80">
          💡 <strong>Did you know?</strong> You can explore different tax policy scenarios using the policy sliders above to see how changes would affect your tax burden and the federal budget.
        </p>
      </div>
    </div>
  );
}