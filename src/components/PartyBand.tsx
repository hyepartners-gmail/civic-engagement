import { PresidentTerm } from '@/types';
import { useUi } from '@/contexts/UiContext';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { Pin } from 'lucide-react';

interface PresidentialTermBlock {
  president: string;
  party: 'Democrat' | 'Republican' | 'Other';
  startFY: number;
  endFY: number;
  termNumber: number;
  originalTerm: PresidentTerm;
}

interface PartyBandProps {
  terms: PresidentTerm[];
  minYear: number;
  maxYear: number;
  tooltipData?: Record<number, any>; // Allow external data for tooltips
  className?: string;
  paddingLeft?: number;
  paddingRight?: number;
}

export default function PartyBand({ terms, minYear, maxYear, tooltipData, className = "", paddingLeft = 60, paddingRight = 20 }: PartyBandProps) {
  const { setYear, pinTerm } = useUi();
  const totalDuration = maxYear - minYear;

  const getPartyColor = (party: string) => {
    if (party === 'Democrat') return '#3b82f6'; // Beautiful blue from the far left of the gradient
    if (party === 'Republican') return '#ef4444'; // Beautiful red from the far right of the gradient
    return '#6b7280'; // gray-500 for others
  };

  // Filter terms to only include those within the chart's date range
  const getRelevantTerms = (terms: PresidentTerm[]): PresidentTerm[] => {
    return terms.filter(term => {
      // Include term if it overlaps with the chart's date range
      return term.endFY >= minYear && term.startFY <= maxYear;
    }).map(term => {
      // Trim the term to fit within the chart's date range
      return {
        ...term,
        startFY: Math.max(term.startFY, minYear),
        endFY: Math.min(term.endFY, maxYear)
      };
    });
  };

  // Split terms into 4-year blocks
  const createTermBlocks = (terms: PresidentTerm[]): PresidentialTermBlock[] => {
    const blocks: PresidentialTermBlock[] = [];
    const relevantTerms = getRelevantTerms(terms);
    
    // First, consolidate consecutive terms by the same president to handle overlaps
    const consolidatedTerms: PresidentTerm[] = [];
    let currentConsolidated: PresidentTerm | null = null;
    
    relevantTerms.forEach((term) => {
      if (currentConsolidated && 
          currentConsolidated.president === term.president && 
          currentConsolidated.party === term.party &&
          // Handle the typical 1-year overlap (e.g., 2017-2017 overlap between Trump terms)
          Math.abs(currentConsolidated.endFY - term.startFY) <= 1) {
        // Extend the current consolidated term to the later end date
        currentConsolidated.endFY = Math.max(currentConsolidated.endFY, term.endFY);
      } else {
        // Start a new consolidated term
        if (currentConsolidated) {
          consolidatedTerms.push(currentConsolidated);
        }
        currentConsolidated = { ...term };
      }
    });
    
    // Don't forget the last consolidated term
    if (currentConsolidated) {
      consolidatedTerms.push(currentConsolidated);
    }
    
    // Now split consolidated terms into 4-year blocks (this will show distinct terms)
    consolidatedTerms.forEach((term) => {
      const totalYears = term.endFY - term.startFY + 1;
      const fullTerms = Math.floor(totalYears / 4);
      const remainingYears = totalYears % 4;
      
      // Create full 4-year terms (these will show as separate blocks)
      for (let i = 0; i < fullTerms; i++) {
        const startYear = term.startFY + (i * 4);
        const endYear = startYear + 3;
        blocks.push({
          president: term.president,
          party: term.party,
          startFY: startYear,
          endFY: endYear,
          termNumber: i + 1,
          originalTerm: term
        });
      }
      
      // Handle remaining years as a partial term (only if significant, e.g., > 1 year)
      if (remainingYears > 1) {
        const startYear = term.startFY + (fullTerms * 4);
        blocks.push({
          president: term.president,
          party: term.party,
          startFY: startYear,
          endFY: term.endFY,
          termNumber: fullTerms + 1,
          originalTerm: term
        });
      }
    });
    
    return blocks;
  };

  const termBlocks = createTermBlocks(terms);

  return (
    <div className={className}>
      {/* Container adjusted for Nivo chart's actual plotting area */}
      <div className="w-full" style={{ paddingLeft: `${paddingLeft}px`, paddingRight: `${paddingRight}px` }}>
        <div className="w-full h-6 flex overflow-hidden">
          {termBlocks.map((block, index) => {
            const duration = block.endFY - block.startFY + 1;
            const width = `${(duration / totalDuration) * 100}%`;
            const isFullTerm = duration === 4;
            
            const nextBlock = termBlocks[index + 1];
            const showBorder = !isFullTerm && (!nextBlock || nextBlock.party !== block.party);

            return (
              <Tooltip key={`${block.president}-${block.startFY}-${index}`}>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => setYear(block.startFY)}
                    className={`h-full transition-opacity hover:opacity-100 opacity-90 cursor-pointer ${showBorder ? 'border-r border-white/20' : ''}`}
                    style={{ 
                      width, 
                      backgroundColor: getPartyColor(block.party)
                    }}
                    aria-label={`${block.president} Term ${block.termNumber} (${block.startFY}-${block.endFY})`}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-platform-contrast text-platform-text border-platform-accent">
                  <div className="p-2">
                    <p className="font-bold">{block.president}</p>
                    <p className="text-sm text-platform-text/80">{block.party}</p>
                    <p className="text-xs font-mono">
                      Term {block.termNumber} • FY {block.startFY} - {block.endFY}
                      {!isFullTerm && ` (${duration} years)`}
                    </p>
                    {tooltipData && tooltipData[block.startFY] && (
                      <div className="mt-2 pt-2 border-t border-platform-accent/30">
                        <div className="text-xs text-platform-text/70">
                          {typeof tooltipData[block.startFY] === 'object' 
                            ? Object.entries(tooltipData[block.startFY]).map(([key, value]) => (
                                <div key={key}>{key}: {String(value)}</div>
                              ))
                            : String(tooltipData[block.startFY])
                          }
                        </div>
                      </div>
                    )}
                    <Button size="sm" variant="ghost" className="mt-2 w-full h-8" onClick={() => pinTerm(block.originalTerm)}>
                      <Pin className="h-4 w-4 mr-2" />
                      Pin for Comparison
                    </Button>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
      {/* Fiscal Year label moved here */}
      <div className="text-center mt-2">
        <span className="text-xs text-platform-text/70">Fiscal Year</span>
      </div>
    </div>
  );
}