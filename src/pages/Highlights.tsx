import React from 'react';
import HighlightsReel from '../components/HighlightsReel';

const HighlightsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-platform-background text-platform-text p-6 sm:p-8 font-sans"> {/* Increased padding */}
      <h1 className="text-2xl sm:text-3xl font-thin mb-8 sm:mb-10 text-platform-text">Your Civic Highlights</h1> {/* Increased mb */}
      <HighlightsReel />
    </div>
  );
};

export default HighlightsPage;