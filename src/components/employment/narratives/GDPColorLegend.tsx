const GDP_BINS = [
  { label: 'Strong Growth (≥4%)', color: '#4ade80' },
  { label: 'Moderate Growth (2-4%)', color: '#a3e635' },
  { label: 'Slow Growth (0-2%)', color: '#fbbf24' },
  { label: 'Mild Contraction (0 to -2%)', color: '#f87171' },
  { label: 'Recession (≤-2%)', color: '#ef4444' },
  { label: 'N/A', color: '#999' },
];

export default function GDPColorLegend() {
  return (
    <div className="space-y-2">
      {GDP_BINS.map(bin => (
        <div key={bin.label} className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: bin.color }} />
          <span className="text-sm">{bin.label}</span>
        </div>
      ))}
    </div>
  );
}