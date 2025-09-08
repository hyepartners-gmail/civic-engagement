import React from 'react';
import { Button } from './ui/button';

interface SuggestionButtonProps {
  onClick?: () => void; // Make onClick optional
}

const SuggestionButton: React.FC<SuggestionButtonProps> = ({ onClick }) => {
  return (
    <Button 
      variant="platform-secondary" // Using new platform variant
      className="px-6 py-3 text-sm sm:text-base" // Standardized padding
      onClick={onClick} // Pass the onClick prop
    >
      Suggest Solution
    </Button>
  );
};

export default SuggestionButton;