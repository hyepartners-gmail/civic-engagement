import { useUi } from '@/contexts/UiContext';
import { useSSRSafeDebounce } from '@/hooks/useSSRSafeDebounce';
import { useEffect, useState } from 'react';

export default function YearSlider({ minYear, maxYear }: { minYear: number; maxYear: number }) {
  const { year, setYear } = useUi();
  const [localYear, setLocalYear] = useState(year);
  const debouncedYear = useSSRSafeDebounce(localYear, 100);

  useEffect(() => {
    setYear(debouncedYear);
  }, [debouncedYear, setYear]);
  
  useEffect(() => {
    setLocalYear(year);
  }, [year]);

  const progress = ((localYear - minYear) / (maxYear - minYear)) * 100;

  return (
    <div className="flex items-center gap-6">
      <span className="text-lg font-bold text-white/90 min-w-[4rem]">{minYear}</span>
      <div className="flex-1 relative">
        {/* Track */}
        <div className="h-3 bg-purple-900/50 rounded-full relative overflow-hidden">
          {/* Progress fill with neon gradient */}
          <div 
            className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-pink-300 rounded-full transition-all duration-200 shadow-lg"
            style={{ width: `${progress}%` }}
          />
          {/* Neon glow effect */}
          <div 
            className="absolute top-0 h-full bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-200 rounded-full opacity-60 blur-sm transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Slider input (invisible but functional) */}
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={localYear}
          onChange={(e) => setLocalYear(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Year Selector"
        />
        
        {/* Current year indicator */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 border-purple-400 transition-all duration-200 hover:scale-110"
          style={{ left: `calc(${progress}% - 12px)` }}
        >
          <div className="absolute inset-1 bg-gradient-to-br from-purple-400 to-fuchsia-500 rounded-full animate-pulse" />
        </div>
        
        {/* Current year display */}
        <div 
          className="absolute -top-10 -translate-x-1/2 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg"
          style={{ left: `${progress}%` }}
        >
          {localYear}
        </div>
      </div>
      <span className="text-lg font-bold text-white/90 min-w-[4rem]">{maxYear}</span>
    </div>
  );
}