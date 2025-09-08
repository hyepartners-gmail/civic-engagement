import { motion } from 'framer-motion';
import { fmtPct } from '@/utils/number';

interface DiffBarProps {
  pctChange: number | null;
  isGood: boolean; // True if a positive change is good
}

export default function DiffBar({ pctChange, isGood }: DiffBarProps) {
  if (pctChange === null) return <div className="h-6 bg-platform-contrast/30 rounded" />;

  const isPositive = pctChange > 0;
  const color = isPositive ? (isGood ? 'bg-green-500' : 'bg-red-500') : (isGood ? 'bg-red-500' : 'bg-green-500');
  const width = Math.min(100, Math.abs(pctChange) * 100);

  return (
    <div className="w-full bg-platform-contrast/30 rounded h-6 relative overflow-hidden">
      <motion.div
        className={`h-full rounded ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-white mix-blend-difference">
          {isPositive ? '+' : ''}{fmtPct(pctChange)}
        </span>
      </div>
    </div>
  );
}