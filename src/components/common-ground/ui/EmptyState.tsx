import React from 'react';
import PlatformCard from '@/components/PlatformCard';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <PlatformCard className="text-center p-8">
      {icon && <div className="mx-auto h-12 w-12 text-platform-text/50">{icon}</div>}
      <h3 className="mt-4 text-lg font-semibold text-platform-text">{title}</h3>
      <p className="mt-2 text-sm text-platform-text/70">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </PlatformCard>
  );
}