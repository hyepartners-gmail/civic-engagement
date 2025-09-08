"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Gavel, PlusCircle } from 'lucide-react';
import PlatformCard from './PlatformCard';
import { Button } from './ui/button'; // Import Button

interface SuggestAmendmentCardProps {
  onClick: () => void;
  canSuggest: boolean;
}

const SuggestAmendmentCard: React.FC<SuggestAmendmentCardProps> = ({ onClick, canSuggest }) => {
  return (
    <motion.div
      className="cursor-pointer group col-span-8" // Span 8 columns for a wider card
      whileHover={{ scale: 1.02, boxShadow: "0 10px 15px rgba(0, 0, 0, 0.3)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={canSuggest ? onClick : undefined}
    >
      <PlatformCard 
        className={`p-6 sm:p-8 relative h-full flex flex-col items-center justify-center text-center
          bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-red-500/50
          ${canSuggest ? 'hover:from-blue-600/30 hover:to-blue-800/30' : 'opacity-50 cursor-not-allowed'}
        `}
      >
        <div className="flex items-center gap-4 mb-4">
          <Gavel className="h-10 w-10 text-blue-400" />
          <h3 className="text-3xl font-bold text-blue-300">Suggest a New Amendment</h3>
        </div>
        <p className="text-lg text-blue-200 mb-6">
          Have an idea for a constitutional amendment or a new law? Propose it here!
        </p>
        <Button 
          onClick={canSuggest ? onClick : undefined} 
          variant="destructive" // Use destructive variant for red button
          className="flex items-center gap-2 px-6 py-3 text-sm sm:text-base"
          disabled={!canSuggest}
        >
          <PlusCircle className="h-5 w-5" />
          <span className="font-medium">Propose Amendment</span>
        </Button>
      </PlatformCard>
    </motion.div>
  );
};

export default SuggestAmendmentCard;