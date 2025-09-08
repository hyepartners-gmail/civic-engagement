import React from 'react';
import { Badge as ShadcnBadge } from './ui/badge';
import { Scale, ScrollText, ClipboardList, LucideProps } from 'lucide-react';

interface TopicTypeBadgeProps {
  changeType?: 'law' | 'amendment' | 'rule'; // Make it optional to match Topic interface
}

const TopicTypeBadge: React.FC<TopicTypeBadgeProps> = ({ changeType }) => {
  let IconComponent: React.ElementType<LucideProps> | null = null; // Initialize to null
  let label: string = '';
  let colorClass: string = '';

  switch (changeType) {
    case 'law':
      IconComponent = Scale;
      label = 'Law';
      colorClass = 'bg-blue-600 hover:bg-blue-700 text-white';
      break;
    case 'amendment':
      IconComponent = ScrollText;
      label = 'Amendment';
      colorClass = 'bg-purple-600 hover:bg-purple-700 text-white';
      break;
    case 'rule':
      IconComponent = ClipboardList;
      label = 'Rule';
      colorClass = 'bg-orange-600 hover:bg-orange-700 text-white';
      break;
    default:
      return null; // If changeType is undefined or unrecognized, render nothing
  }

  return (
    <ShadcnBadge 
      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium ${colorClass}`}
    >
      {IconComponent && <IconComponent className="h-3 w-3" />} {/* Conditionally render icon */}
      {label}
    </ShadcnBadge>
  );
};

export default TopicTypeBadge;