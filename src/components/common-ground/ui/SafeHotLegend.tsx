import { SAFE_TOLERANCE, HOT_THRESHOLD } from '@/lib/common-ground/constants';

export default function SafeHotLegend() {
  return (
    <div className="flex items-center space-x-6 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-green-500" />
        <span><strong>Safe:</strong> Score range ≤ {SAFE_TOLERANCE}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-red-500" />
        <span><strong>Hot:</strong> Score range ≥ {HOT_THRESHOLD}</span>
      </div>
    </div>
  );
}