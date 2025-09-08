"use client";
import { useLab } from '@/contexts/LabContext';
import { Button } from './ui/button';
import { History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScenarioHistory() {
  const { history, setScenario } = useLab();

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <History className="h-4 w-4" />
        Recent Scenarios
      </h3>
      <div className="space-y-2">
        <AnimatePresence>
          {history.map((pastScenario, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left h-auto border-platform-accent text-platform-accent hover:bg-platform-accent hover:text-white"
                onClick={() => setScenario(pastScenario, true)}
              >
                <div className="flex-1">
                  <p className="text-xs font-mono">
                    {Object.keys(pastScenario.deltas).length} changes, {pastScenario.customPrograms?.length || 0} programs
                  </p>
                </div>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}