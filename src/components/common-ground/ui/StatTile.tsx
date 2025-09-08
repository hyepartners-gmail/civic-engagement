import PlatformCard from '@/components/PlatformCard';

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
}

export default function StatTile({ label, value, unit }: StatTileProps) {
  return (
    <PlatformCard className="p-4 text-center">
      <dt className="text-sm text-platform-text/70 truncate">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-platform-accent">
        {value}
        {unit && <span className="text-lg ml-1">{unit}</span>}
      </dd>
    </PlatformCard>
  );
}