'use client';
import { Recession } from '@/types/employment';
import { fmtShort } from '@/utils/number';
import { motion } from 'framer-motion';

interface NetChangeBarcodeProps {
  data: { date: string; value: number | null }[];
  recessions: Recession[]; // Ensure this is always an array
  recoveries: { peakMonth: string; troughMonth: string; recoveryMonth: string | null }[];
  showRecoveryPaths: boolean;
  onHover: (index: number | null) => void;
}

export default function NetChangeBarcode({ data, recessions, recoveries, showRecoveryPaths, onHover }: NetChangeBarcodeProps) {
  const values = data.map(d => d.value).filter((v): v is number => v !== null);
  const maxAbsValue = Math.max(...values.map(Math.abs));

  const dateToIndex = new Map(data.map((d, i) => [d.date.substring(0, 7), i]));

  return (
    <div className="relative h-full w-full" onMouseLeave={() => onHover(null)}>
      {/* Recession Shading */}
      {(recessions || []).map((rec, i) => { // Ensure recessions is an array
        const startIndex = dateToIndex.get(rec.start.substring(0, 7)) ?? -1;
        const endIndex = dateToIndex.get(rec.end.substring(0, 7)) ?? data.length - 1;
        if (startIndex === -1) return null;
        const left = `${(startIndex / data.length) * 100}%`;
        const width = `${((endIndex - startIndex + 1) / data.length) * 100}%`;
        return <div key={i} className="absolute top-0 bottom-0 bg-platform-contrast/50" style={{ left, width }} />;
      })}

      {/* Recovery Paths */}
      {showRecoveryPaths && recoveries.map((rec, i) => {
        const startIndex = dateToIndex.get(rec.troughMonth.substring(0, 7)) ?? -1;
        const endIndex = rec.recoveryMonth ? dateToIndex.get(rec.recoveryMonth.substring(0, 7)) ?? -1 : -1;
        if (startIndex === -1 || endIndex === -1) return null;
        const left = `${(startIndex / data.length) * 100}%`;
        const width = `${((endIndex - startIndex + 1) / data.length) * 100}%`;
        return <div key={i} className="absolute top-0 h-1 bg-platform-accent" style={{ left, width }} />;
      })}

      {/* Barcode */}
      <div className="flex h-full w-full items-center">
        {data.map((d, i) => (
          <div
            key={d.date}
            className="flex-1 h-full relative"
            onMouseEnter={() => onHover(i)}
          >
            {d.value !== null && (
              <motion.div
                className="absolute bottom-1/2 left-0 right-0 mx-auto w-[90%]"
                style={{
                  height: `${(Math.abs(d.value) / maxAbsValue) * 50}%`,
                  backgroundColor: d.value > 0 ? '#3b82f6' : '#ef4444',
                  transform: d.value > 0 ? 'translateY(-100%)' : 'translateY(0)',
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: i * 0.001 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}