import React from 'react';
import PlatformCard from './PlatformCard'; // Import PlatformCard

const ExpandableBox: React.FC = () => {
  return (
    <PlatformCard className="p-4">
      <h3 className="text-lg font-semibold">Expandable Box Placeholder</h3>
      <p className="text-sm mt-2">This component will be an expandable content box.</p>
    </PlatformCard>
  );
};

export default ExpandableBox;