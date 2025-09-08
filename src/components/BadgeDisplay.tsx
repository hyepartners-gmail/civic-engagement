import React from 'react';
import { Badge as ShadcnBadge } from './ui/badge';
import { Badge as BadgeType } from '../types';
import * as LucideIcons from 'lucide-react';
import { LucideProps, IconNode } from 'lucide-react'; // Import types for Lucide icons

interface BadgeDisplayProps {
  badge: BadgeType;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badge }) => {
  // Dynamically get the icon component, asserting its type more precisely
  const IconComponent = badge.icon 
    ? (LucideIcons[badge.icon as keyof typeof LucideIcons] as React.ElementType<LucideProps>) 
    : null;

  return (
    <ShadcnBadge variant="secondary" className="bg-platform-accent/20 text-purple-600 border-platform-accent/50 px-2 py-1 text-xs font-medium">
      {IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
      {badge.name}
    </ShadcnBadge>
  );
};

export default BadgeDisplay;