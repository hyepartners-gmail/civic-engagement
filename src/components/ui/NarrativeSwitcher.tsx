'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useUrlState } from '@/hooks/useUrlState';
import { ChevronDown } from 'lucide-react';

type Item = { id: string; label: string; description?: string };

export default function NarrativeSwitcher({ items }: { items: Item[] }) {
  const [narrative, setNarrative] = useUrlState<string>('n', items[0]?.id);
  const [isOpen, setIsOpen] = useState(false);
  const currentItem = items.find(item => item.id === narrative) || items[0];
  
  return (
    <>
      {/* Desktop Version - Hidden on mobile */}
      <div className="hidden lg:flex flex-wrap items-center gap-1 p-1 bg-platform-contrast/20 rounded-xl border border-platform-contrast/30">
        {items.map(it => (
          <button
            key={it.id}
            aria-pressed={narrative === it.id}
            onClick={() => setNarrative(it.id)}
            className={`relative px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              narrative !== it.id 
                ? 'text-platform-text hover:text-platform-text hover:bg-platform-contrast/30' 
                : 'text-platform-accent font-bold'
            }`}
            title={it.description || it.label}
          >
            {narrative === it.id && (
              <motion.div
                layoutId="narrative-switcher-active"
                className="absolute inset-0 bg-platform-accent/30 border border-platform-accent rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{it.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile/Tablet Version - Custom Dropdown */}
      <div className="lg:hidden relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 bg-platform-contrast border-2 border-platform-accent rounded-lg hover:bg-platform-accent/30 transition-colors"
          aria-expanded={isOpen}
        >
          <span className="text-sm font-medium text-white">{currentItem?.label}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-white" />
          </motion.div>
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="fixed w-full left-0 mt-2 bg-platform-contrast border-2 border-platform-accent rounded-lg shadow-xl z-[9999] max-h-80 overflow-y-auto"
              style={{
                maxWidth: "calc(100vw - 2rem)",
                top: "auto",
                width: "100%"
              }}
            >
              {items.map(it => (
                <button
                  key={it.id}
                  onClick={() => {
                    setNarrative(it.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-4 transition-colors ${
                    narrative === it.id 
                      ? 'bg-platform-accent/70 text-white font-bold border-l-4 border-white' 
                      : 'text-white hover:bg-platform-accent/30'
                  }`}
                >
                  <div className="font-medium text-sm">{it.label}</div>
                  {it.description && (
                    <div className="text-xs text-white mt-1 leading-relaxed">
                      {it.description}
                    </div>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Backdrop to close dropdown */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </>
  );
}