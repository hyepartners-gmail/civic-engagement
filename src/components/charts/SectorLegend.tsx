'use client';
import { motion } from 'framer-motion';

interface SectorLegendProps {
  sectors: { id: string; name: string; color: string }[];
  activeSector: string | null;
  onSectorChange: (id: string | null) => void;
}

export default function SectorLegend({ sectors, activeSector, onSectorChange }: SectorLegendProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {sectors.map(sector => (
        <motion.button
          key={sector.id}
          onClick={() => onSectorChange(activeSector === sector.id ? null : sector.id)}
          className="flex items-center gap-2 text-sm cursor-pointer"
          animate={{ opacity: activeSector === null || activeSector === sector.id ? 1 : 0.5 }}
        >
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sector.color }} />
          <span>{sector.name}</span>
        </motion.button>
      ))}
    </div>
  );
}