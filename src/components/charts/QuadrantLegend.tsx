"use client";

interface QuadrantLegendProps {
  xThreshold: number; // Temperature anomaly threshold (typically 0°C)
  yThreshold: number; // Productivity proxy threshold (typically median)
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export default function QuadrantLegend({ 
  xThreshold, 
  yThreshold,
  xAxisLabel = 'Temperature Anomaly',
  yAxisLabel = 'Productivity Proxy'
}: QuadrantLegendProps) {
  const quadrants = [
    {
      id: 'hotter-worse',
      title: 'Hotter & Worse',
      description: `Above average ${xAxisLabel.toLowerCase()} and below average ${yAxisLabel.toLowerCase()}`,
      color: 'bg-red-100 border-red-300',
      position: 'top-right'
    },
    {
      id: 'hotter-better',
      title: 'Hotter & Better',
      description: `Above average ${xAxisLabel.toLowerCase()} and above average ${yAxisLabel.toLowerCase()}`,
      color: 'bg-orange-100 border-orange-300',
      position: 'bottom-right'
    },
    {
      id: 'cooler-worse',
      title: 'Cooler & Worse',
      description: `Below average ${xAxisLabel.toLowerCase()} and below average ${yAxisLabel.toLowerCase()}`,
      color: 'bg-blue-100 border-blue-300',
      position: 'top-left'
    },
    {
      id: 'cooler-better',
      title: 'Cooler & Better',
      description: `Below average ${xAxisLabel.toLowerCase()} and above average ${yAxisLabel.toLowerCase()}`,
      color: 'bg-green-100 border-green-300',
      position: 'bottom-left'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      {quadrants.map((quadrant) => (
        <div 
          key={quadrant.id}
          className={`p-3 border rounded-lg ${quadrant.color}`}
        >
          <h4 className="font-semibold text-sm">{quadrant.title}</h4>
          <p className="text-xs text-gray-600 mt-1">{quadrant.description}</p>
          <div className="flex items-center mt-2 text-xs">
            <span className="bg-gray-200 px-1 py-0.5 rounded">
              {xAxisLabel}: {xThreshold >= 0 ? `≥ ${xThreshold}°C` : `≤ ${xThreshold}°C`}
            </span>
            <span className="mx-1">·</span>
            <span className="bg-gray-200 px-1 py-0.5 rounded">
              {yAxisLabel}: {quadrant.id.includes('worse') ? `< ${yThreshold.toFixed(1)}` : `≥ ${yThreshold.toFixed(1)}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}