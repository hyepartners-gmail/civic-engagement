"use client";
import React, { useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { useUi } from '@/contexts/UiContext';
import { useHierarchy } from '@/hooks/useHierarchy';
import { Year } from '@/types';
import { fmtShort, fmtPct } from '@/utils/number';
import PersonalTaxJourney from '@/components/PersonalTaxJourney';

const STORY_POINTS = [
  {
    title: "Your Tax Dollar Journey",
    description: "Every tax dollar you pay takes a journey through the federal government. Let's follow where your money goes and see the impact of your contribution to America.",
    highlightIds: [],
    visualization: "intro",
  },
  {
    title: "The Safety Net You Support",
    description: "A large portion of your contribution goes to Income Security programs - the social safety net that includes Social Security, unemployment benefits, and assistance for those in need. Your taxes help millions of Americans during difficult times.",
    highlightIds: ['func:600'],
    visualization: "safety-net",
  },
  {
    title: "Defending the Nation",
    description: "Your tax dollars help fund national defense - from military personnel and equipment to cybersecurity and international peacekeeping. See how your contribution helps protect American interests at home and abroad.",
    highlightIds: ['func:000'],
    visualization: "defense",
  },
  {
    title: "The Cost of Borrowing",
    description: "A growing portion of your taxes goes toward paying interest on the national debt - money borrowed in previous years to fund government operations. This is money that doesn't directly fund new programs or services.",
    highlightIds: ['func:900'],
    visualization: "interest",
  },
  {
    title: "Investing in Tomorrow's Workforce",
    description: "While federal education spending may seem small compared to other categories, your tax dollars support college financial aid, research universities, and special education programs that shape America's future.",
    highlightIds: ['func:500'],
    visualization: "education",
  },
  {
    title: "Your Fiscal Impact",
    description: "Your individual contribution is part of a larger fiscal story. See how your tax dollars contribute to the nation's overall fiscal health and long-term economic sustainability.",
    highlightIds: [],
    visualization: "impact",
  },
];

const StoryPoint = ({ point, year }: { point: typeof STORY_POINTS[0], year: Year }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-50% 0px -50% 0px" });
  const { setHighlightedNodeIds } = useUi();
  const { getNode } = useHierarchy();

  useEffect(() => {
    if (isInView) {
      setHighlightedNodeIds(point.highlightIds);
    }
  }, [isInView, point.highlightIds, setHighlightedNodeIds]);

  // Calculate values for the highlighted nodes
  const storyData = point.highlightIds.map(id => {
    const node = getNode(id);
    if (!node) return null;
    const value = node.values[year]?.nominal || 0;
    return {
      name: node.name,
      value,
      formatted: fmtShort(value)
    };
  }).filter(Boolean);

  const getVisualizationContent = () => {
    switch (point.visualization) {
      case "intro":
        return (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                💰
              </div>
            </div>
            <p className="text-xs text-platform-text/70 italic">
              Your personal contribution becomes part of America's $6+ trillion budget
            </p>
          </div>
        );
      
      case "safety-net":
        return (
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center text-sm bg-blue-500/20 px-3 py-2 rounded">
              <span>🛡️ Social Security</span>
              <span className="font-mono text-blue-400">Major Program</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-purple-500/20 px-3 py-2 rounded">
              <span>🏠 Housing Assistance</span>
              <span className="font-mono text-purple-400">Support</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-green-500/20 px-3 py-2 rounded">
              <span>🍽️ Food Programs</span>
              <span className="font-mono text-green-400">Nutrition</span>
            </div>
          </div>
        );
      
      case "defense":
        return (
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-red-500/20 p-2 rounded text-center">
                <div className="text-lg">🪖</div>
                <div>Personnel</div>
              </div>
              <div className="bg-orange-500/20 p-2 rounded text-center">
                <div className="text-lg">✈️</div>
                <div>Equipment</div>
              </div>
              <div className="bg-yellow-500/20 p-2 rounded text-center">
                <div className="text-lg">🏭</div>
                <div>Operations</div>
              </div>
              <div className="bg-blue-500/20 p-2 rounded text-center">
                <div className="text-lg">🛡️</div>
                <div>Security</div>
              </div>
            </div>
          </div>
        );
      
      case "interest":
        return (
          <div className="mt-6 space-y-3">
            <div className="bg-red-500/20 p-3 rounded">
              <div className="text-center">
                <div className="text-2xl text-red-400">📈</div>
                <div className="text-xs text-red-300 mt-1">Growing every second</div>
              </div>
            </div>
            <div className="text-xs text-platform-text/70 text-center">
              Interest payments don't build roads, schools, or provide services - they pay for past spending
            </div>
          </div>
        );
      
      case "education":
        return (
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center text-sm bg-indigo-500/20 px-3 py-2 rounded">
              <span>🎓 Higher Education</span>
              <span className="font-mono text-indigo-400">Pell Grants</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-cyan-500/20 px-3 py-2 rounded">
              <span>🔬 Research</span>
              <span className="font-mono text-cyan-400">Innovation</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-teal-500/20 px-3 py-2 rounded">
              <span>🏫 Special Ed</span>
              <span className="font-mono text-teal-400">Support</span>
            </div>
          </div>
        );
      
      case "impact":
        return (
          <div className="mt-6 space-y-3">
            <div className="text-center bg-gradient-to-r from-platform-accent/20 to-platform-cyan/20 p-4 rounded">
              <div className="text-lg font-bold text-platform-accent">🇺🇸</div>
              <div className="text-xs text-platform-text/80 mt-2">
                Your contribution joins millions of others to fund the essential operations of American democracy
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div ref={ref} className="h-screen flex items-center justify-center px-4">
      <motion.div
        className="max-w-lg text-center p-8 bg-platform-contrast/90 backdrop-blur-sm rounded-xl shadow-2xl border border-platform-accent/20"
        initial={{ opacity: 0.5, y: 20, scale: 0.95 }}
        animate={{ 
          opacity: isInView ? 1 : 0.5, 
          y: isInView ? 0 : 20,
          scale: isInView ? 1 : 0.95
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h3 className="text-3xl font-thin text-platform-accent mb-3">{point.title}</h3>
        <p className="text-platform-text/90 leading-relaxed mb-4">{point.description}</p>
        
        {/* Data display for highlighted nodes */}
        {storyData.length > 0 && (
          <div className="space-y-2 text-sm bg-platform-accent/10 p-4 rounded-lg mb-4">
            {storyData.map((item: any) => (
              <div key={item.name} className="flex justify-between items-center">
                <span className="text-platform-text/80">{item.name}</span>
                <span className="font-mono text-platform-accent font-bold">{item.formatted}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Custom visualization content */}
        {getVisualizationContent()}
        
        {/* Progress indicator */}
        <div className="mt-6 flex justify-center">
          <div className="text-xs text-platform-text/50">
            Story {STORY_POINTS.findIndex(s => s.title === point.title) + 1} of {STORY_POINTS.length}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function StoryMode({ year }: { year: Year }) {
  const { highlightedNodeIds } = useUi();
  
  return (
    <div className="relative">
      {STORY_POINTS.map((point, index) => (
        <StoryPoint key={index} point={point} year={year} />
      ))}
      
      {/* Interactive Personal Tax Journey */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-8">
            <h2 className="text-4xl font-thin text-platform-accent mb-4">
              Your Complete Tax Journey
            </h2>
            <p className="text-platform-text/80 text-lg max-w-2xl mx-auto">
              Now that you understand where tax dollars go, explore your personal contribution 
              to America's fiscal operations with this detailed breakdown.
            </p>
          </div>
          
          <PersonalTaxJourney 
            highlightedCategory={highlightedNodeIds[0]} 
          />
        </motion.div>
      </div>
    </div>
  );
}