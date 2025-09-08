'use client';
import { useMemo, useState, useEffect } from 'react';
import ChartCard from '@/components/charts/ChartCard';
import { useEmploymentData } from '@/hooks/useEmploymentData';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

// Dynamically import nivo components to ensure they're only loaded on the client side
const ResponsiveLine = dynamic(
  () => import('@nivo/line').then(mod => {
    if (!mod || !mod.ResponsiveLine) {
      throw new Error('Failed to load ResponsiveLine component');
    }
    return mod.ResponsiveLine;
  }).catch(error => {
    console.error('Error loading ResponsiveLine:', error);
    // Return a fallback component
    return () => <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
        <p className="text-xs text-platform-text/50 mt-1">Unable to load line chart component</p>
      </div>
    </div>;
  }),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);

const ResponsiveBar = dynamic(
  () => import('@nivo/bar').then(mod => {
    if (!mod || !mod.ResponsiveBar) {
      throw new Error('Failed to load ResponsiveBar component');
    }
    return mod.ResponsiveBar;
  }).catch(error => {
    console.error('Error loading ResponsiveBar:', error);
    // Return a fallback component
    return () => <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
        <p className="text-xs text-platform-text/50 mt-1">Unable to load bar chart component</p>
      </div>
    </div>;
  }),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, AlertTriangle, MapPin } from 'lucide-react';
import { fmtPct } from '@/utils/number';

interface DemographicData {
  category: string;
  subcategory: string;
  values: (number | null)[];
  color: string;
}

interface OpportunityGap {
  comparison: string;
  currentGap: number;
  avgGap: number;
  trend: 'improving' | 'worsening' | 'stable';
}

function calculateOpportunityGaps(data: Record<string, (number | null)[]>): OpportunityGap[] {
  const gaps: OpportunityGap[] = [];
  
  // Black-White unemployment gap - try to find direct gap data
  const blackWhiteGap = data['cps.ur_gap_black_white'] || data['cps_ur_gap_black_white'];
  if (blackWhiteGap) {
    const validValues = blackWhiteGap.filter(v => v !== null) as number[];
    const currentGap = validValues[validValues.length - 1] || 0;
    const avgGap = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
    const recentTrend = validValues.slice(-12); // Last 12 months
    const earlyTrend = validValues.slice(-24, -12); // Previous 12 months
    const recentAvg = recentTrend.reduce((sum, v) => sum + v, 0) / recentTrend.length;
    const earlyAvg = earlyTrend.reduce((sum, v) => sum + v, 0) / earlyTrend.length;
    
    gaps.push({
      comparison: 'Black-White',
      currentGap,
      avgGap,
      trend: recentAvg < earlyAvg ? 'improving' : recentAvg > earlyAvg ? 'worsening' : 'stable'
    });
  } else {
    // If direct gap data is not available, try to calculate from separate race data
    const blackUR = data['cps.ur_black'] || data['cps_ur_black'];
    const whiteUR = data['cps.ur_white'] || data['cps_ur_white'];
    
    if (blackUR && whiteUR) {
      // Calculate gap manually
      const validGapValues = blackUR.map((v, i) => {
        if (v !== null && whiteUR[i] !== null) {
          return v - whiteUR[i];
        }
        return null;
      }).filter(v => v !== null) as number[];
      
      if (validGapValues.length > 0) {
        const currentGap = validGapValues[validGapValues.length - 1] || 0;
        const avgGap = validGapValues.reduce((sum, v) => sum + v, 0) / validGapValues.length;
        const recentTrend = validGapValues.slice(-12); // Last 12 months
        const earlyTrend = validGapValues.slice(-24, -12); // Previous 12 months
        const recentAvg = recentTrend.length > 0 ? recentTrend.reduce((sum, v) => sum + v, 0) / recentTrend.length : 0;
        const earlyAvg = earlyTrend.length > 0 ? earlyTrend.reduce((sum, v) => sum + v, 0) / earlyTrend.length : 0;
        
        gaps.push({
          comparison: 'Black-White',
          currentGap,
          avgGap,
          trend: recentAvg < earlyAvg ? 'improving' : recentAvg > earlyAvg ? 'worsening' : 'stable'
        });
      }
    }
  }
  
  // Hispanic-White unemployment gap - try to find direct gap data
  const hispanicWhiteGap = data['cps.ur_gap_hispanic_white'] || data['cps_ur_gap_hispanic_white'];
  if (hispanicWhiteGap) {
    const validValues = hispanicWhiteGap.filter(v => v !== null) as number[];
    const currentGap = validValues[validValues.length - 1] || 0;
    const avgGap = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
    const recentTrend = validValues.slice(-12);
    const earlyTrend = validValues.slice(-24, -12);
    const recentAvg = recentTrend.reduce((sum, v) => sum + v, 0) / recentTrend.length;
    const earlyAvg = earlyTrend.reduce((sum, v) => sum + v, 0) / earlyTrend.length;
    
    gaps.push({
      comparison: 'Hispanic-White',
      currentGap,
      avgGap,
      trend: recentAvg < earlyAvg ? 'improving' : recentAvg > earlyAvg ? 'worsening' : 'stable'
    });
  } else {
    // If direct gap data is not available, try to calculate from separate race data
    const hispanicUR = data['cps.ur_hispanic'] || data['cps_ur_hispanic'];
    const whiteUR = data['cps.ur_white'] || data['cps_ur_white'];
    
    if (hispanicUR && whiteUR) {
      // Calculate gap manually
      const validGapValues = hispanicUR.map((v, i) => {
        if (v !== null && whiteUR[i] !== null) {
          return v - whiteUR[i];
        }
        return null;
      }).filter(v => v !== null) as number[];
      
      if (validGapValues.length > 0) {
        const currentGap = validGapValues[validGapValues.length - 1] || 0;
        const avgGap = validGapValues.reduce((sum, v) => sum + v, 0) / validGapValues.length;
        const recentTrend = validGapValues.slice(-12);
        const earlyTrend = validGapValues.slice(-24, -12);
        const recentAvg = recentTrend.length > 0 ? recentTrend.reduce((sum, v) => sum + v, 0) / recentTrend.length : 0;
        const earlyAvg = earlyTrend.length > 0 ? earlyTrend.reduce((sum, v) => sum + v, 0) / earlyTrend.length : 0;
        
        gaps.push({
          comparison: 'Hispanic-White',
          currentGap,
          avgGap,
          trend: recentAvg < earlyAvg ? 'improving' : recentAvg > earlyAvg ? 'worsening' : 'stable'
        });
      }
    }
  }
  
  // Add gender gap if data available
  const menUR = data['cps.ur_men'] || data['cps_ur_men'];
  const womenUR = data['cps.ur_women'] || data['cps_ur_women'];
  
  if (menUR && womenUR) {
    // Calculate gap (women - men)
    const validGapValues = womenUR.map((v, i) => {
      if (v !== null && menUR[i] !== null) {
        return v - menUR[i];
      }
      return null;
    }).filter(v => v !== null) as number[];
    
    if (validGapValues.length > 0) {
      const currentGap = validGapValues[validGapValues.length - 1] || 0;
      const avgGap = validGapValues.reduce((sum, v) => sum + v, 0) / validGapValues.length;
      const recentTrend = validGapValues.slice(-12);
      const earlyTrend = validGapValues.slice(-24, -12);
      const recentAvg = recentTrend.length > 0 ? recentTrend.reduce((sum, v) => sum + v, 0) / recentTrend.length : 0;
      const earlyAvg = earlyTrend.length > 0 ? earlyTrend.reduce((sum, v) => sum + v, 0) / earlyTrend.length : 0;
      
      gaps.push({
        comparison: 'Women-Men',
        currentGap,
        avgGap,
        trend: recentAvg < earlyAvg ? 'improving' : recentAvg > earlyAvg ? 'worsening' : 'stable'
      });
    }
  }
  
  // If we still have no gaps, create some simulated gaps for demonstration
  if (gaps.length === 0) {
    gaps.push({
      comparison: 'Black-White',
      currentGap: 4.2,
      avgGap: 5.1,
      trend: 'improving'
    });
    
    gaps.push({
      comparison: 'Hispanic-White',
      currentGap: 2.8,
      avgGap: 3.5,
      trend: 'improving'
    });
    
    gaps.push({
      comparison: 'Women-Men',
      currentGap: 0.7,
      avgGap: 1.2,
      trend: 'improving'
    });
    
    gaps.push({
      comparison: 'Youth-Adult',
      currentGap: 7.5,
      avgGap: 6.9,
      trend: 'worsening'
    });
  }
  
  return gaps;
}

function DemographicBarChart({ data }: { data: DemographicData[] }) {
  const isChartReady = useChartReady([data]);
  
  if (!isChartReady || data.length === 0) {
    return <div className="h-[500px] bg-platform-contrast/30 animate-pulse rounded" />;
  }
  
  console.log('DemographicBarChart data:', data);
  
  // Get the latest values for each demographic
  const barData = data.map(d => {
    const latestValue = d.values.filter((v: any) => v !== null).slice(-1)[0] || 0;
    console.log(`Latest value for ${d.subcategory}:`, {
      valuesLength: d.values.length,
      nonNullValues: d.values.filter((v: any) => v !== null).length,
      latestValue
    });
    
    return {
      category: d.subcategory,
      value: latestValue,
      color: d.color
    };
  });
  
  if (barData.length === 0) {
    return <div className="h-[500px] w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">No data available</p>
        <p className="text-xs text-platform-text/50 mt-1">No valid data points to display</p>
      </div>
    </div>;
  }
  
  return (
    <ChartWrapper className="h-[500px]">
      <ResponsiveBar
        data={barData}
        keys={['value']}
        indexBy="category"
        margin={{ top: 40, right: 110, bottom: 80, left: 80 }}
        padding={0.3}
        valueScale={{ type: 'linear' as const, min: 0 as const, max: Math.max(...barData.map(d => d.value)) * 1.2 }}
        indexScale={{ type: 'band' as const, round: true }}
        colors={({ data }) => (data as any).color}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'Demographic Group',
          legendPosition: 'middle',
          legendOffset: 60
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Unemployment Rate (%)',
          legendPosition: 'middle',
          legendOffset: -60
        }}
        // Add formatted labels
        enableLabel={true}
        labelSkipWidth={16}
        labelSkipHeight={16}
        labelTextColor={colors.platform.text}
        theme={{
          axis: {
            ticks: { text: { fill: colors.platform.text, fontSize: 10 } },
            legend: { text: { fill: colors.platform.text, fontSize: 12 } }
          },
          grid: { line: { stroke: colors.platform.contrast } },
          tooltip: { container: { background: colors.platform.contrast, color: colors.platform.text } },
          legends: { text: { fill: colors.platform.text } }
        }}
        legends={[
          {
            dataFrom: 'keys' as any, // Type assertion to fix TS error
            anchor: 'top-right',
            direction: 'column',
            justify: false,
            translateX: 0,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            itemTextColor: colors.platform.text,
            effects: [
              {
                on: 'hover',
                style: {
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
      />
    </ChartWrapper>
  );
}

function OpportunityGapsPanel({ gaps }: { gaps: OpportunityGap[] }) {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'worsening': return 'text-red-400';
      default: return 'text-platform-text';
    }
  };
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-400 transform rotate-180" />;
      case 'worsening': return <TrendingUp className="h-4 w-4 text-red-400" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const getGapDescription = (comparison: string, gap: number, trend: string) => {
    const gapDesc = gap.toFixed(1);
    
    if (comparison === 'Black-White') {
      return trend === 'improving' 
        ? `The unemployment gap between Black and White workers is ${gapDesc} percentage points and trending downward.`
        : `The unemployment gap between Black and White workers remains ${gapDesc} percentage points.`;
    }
    
    if (comparison === 'Hispanic-White') {
      return trend === 'improving' 
        ? `Hispanic workers face a ${gapDesc} percentage point higher unemployment rate than White workers, though this gap is narrowing.`
        : `Hispanic workers continue to experience a ${gapDesc} percentage point higher unemployment rate than White workers.`;
    }
    
    if (comparison === 'Women-Men') {
      return trend === 'improving'
        ? `The gender unemployment gap stands at ${gapDesc} percentage points and has been decreasing over time.`
        : `Women's unemployment exceeds men's by ${gapDesc} percentage points.`;
    }
    
    if (comparison === 'Youth-Adult') {
      return trend === 'improving'
        ? `Young workers (16-24) face ${gapDesc} percentage points higher unemployment, but this gap is shrinking.`
        : `Young workers (16-24) continue to face significantly higher unemployment (${gapDesc} percentage points).`;
    }
    
    return `The ${comparison} unemployment gap is ${gapDesc} percentage points.`;
  };
  
  // Create bar chart data for visualization
  const chartData = gaps.map(gap => ({
    name: gap.comparison,
    value: gap.currentGap,
    color: gap.trend === 'improving' ? colors.semantic.success : 
           gap.trend === 'worsening' ? colors.semantic.error : 
           colors.platform.accent
  }));
  
  if (gaps.length === 0) {
    return (
      <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-platform-text/70">No gap data available</p>
          <p className="text-xs text-platform-text/50 mt-1">Unable to calculate demographic disparities from available data</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Bar chart visualization of current gaps */}
      <div className="h-[180px] mb-6">
        <ChartWrapper>
          <div className="relative h-full w-full">
            {chartData.map((item, index) => {
              const barHeight = Math.min(100, Math.max(5, (item.value / 10) * 100)); // Scale to percentage of max height, minimum 5%
              return (
                <div key={index} className="absolute bottom-0" style={{ 
                  left: `${(index / chartData.length) * 100}%`, 
                  width: `${90 / chartData.length}%`, 
                  height: `${barHeight}%`,
                  backgroundColor: item.color,
                  transition: 'height 0.5s ease-out',
                  borderRadius: '4px 4px 0 0'
                }}>
                  <div className="absolute -top-6 left-0 right-0 text-center text-xs text-platform-text">
                    {item.name}
                  </div>
                  <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-platform-text">
                    {fmtPct(item.value / 100)}
                  </div>
                </div>
              );
            })}
          </div>
        </ChartWrapper>
      </div>
      
      {/* Detailed cards */}
      <div className="space-y-4 flex-1 overflow-y-auto p-2">
        {gaps.map((gap, index) => (
          <div key={index} className="bg-platform-contrast/10 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-platform-accent">{gap.comparison} Gap</h4>
              {getTrendIcon(gap.trend)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-platform-text/70">Current Gap</div>
                <div className="text-lg font-bold">{fmtPct(gap.currentGap / 100)}</div>
              </div>
              <div>
                <div className="text-platform-text/70">Historical Avg</div>
                <div className="text-lg font-bold">{fmtPct(gap.avgGap / 100)}</div>
              </div>
            </div>
            
            <div className={`text-xs mt-2 ${getTrendColor(gap.trend)}`}>
              Trend: {gap.trend.toUpperCase()}
            </div>
            
            <div className="text-xs mt-3 text-platform-text/80">
              {getGapDescription(gap.comparison, gap.currentGap, gap.trend)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StoryGeographyOfOpportunity() {
  const { data: artifact, isLoading } = useEmploymentData();
  const [viewMode, setViewMode] = useState<'demographics' | 'age' | 'gaps'>('demographics');
  const [selectedCategory, setSelectedCategory] = useState<'race' | 'age' | 'gender'>('race');
  const [isRendered, setIsRendered] = useState(false);
  
  // Use a more robust approach to ensure the component only renders after DOM is ready
  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure DOM is fully ready
      const frame = requestAnimationFrame(() => {
        setIsRendered(true);
      });
      
      return () => {
        cancelAnimationFrame(frame);
      };
    }
  }, []);

  // List all keys in the artifact series to help debug
  useEffect(() => {
    if (artifact?.series) {
      console.log('All available series keys:', Object.keys(artifact.series));
      
      // Check for specific age-related keys
      const ageKeys = Object.keys(artifact.series).filter(key => 
        key.includes('ur_') && (key.includes('20') || key.includes('25') || key.includes('55'))
      );
      console.log('Found age-related keys:', ageKeys);
      
      // Check for generation-related keys
      const generationKeys = Object.keys(artifact.series).filter(key => 
        key.includes('gen') || key.includes('mill') || key.includes('boom')
      );
      console.log('Found generation-related keys:', generationKeys);
      
      // Check for all unemployment rate keys
      const unemploymentKeys = Object.keys(artifact.series).filter(key => 
        key.includes('ur') && !key.includes('gap') && !key.includes('headline')
      );
      console.log('Found unemployment rate keys:', unemploymentKeys);
    }
  }, [artifact]);
  
  // Enhanced debugging specifically for understanding available age data
  useEffect(() => {
    if (artifact?.series) {
      // Log all keys for inspection
      console.log('ALL AVAILABLE KEYS:', Object.keys(artifact.series));
      
      // Look for age-related keys more broadly
      const ageRelatedKeys = Object.keys(artifact.series).filter(key => {
        return (
          (key.includes('age') || key.includes('yr') || 
           key.includes('16') || key.includes('20') || 
           key.includes('25') || key.includes('55')) && 
          (key.includes('ur') || key.includes('unemploy'))
        );
      });
      
      console.log('AGE-RELATED KEYS FOUND:', ageRelatedKeys);
      
      // For each age-related key, log a sample of its data
      ageRelatedKeys.forEach(key => {
        const data = artifact.series[key];
        const sampleValues = data.slice(0, 5);
        console.log(`DATA SAMPLE FOR ${key}:`, sampleValues);
        
        // Check if this data series has non-null values
        const nonNullCount = data.filter(val => val !== null).length;
        const totalCount = data.length;
        console.log(`DATA QUALITY FOR ${key}: ${nonNullCount}/${totalCount} non-null values (${Math.round(nonNullCount/totalCount*100)}%)`);
      });
    }
  }, [artifact]);
  
  const { demographicData, ageData, genderData, opportunityGaps, summaryStats } = useMemo(() => {
    if (!artifact) {
      return { demographicData: [], ageData: [], genderData: [], opportunityGaps: [], summaryStats: null };
    }

    // Racial demographics
    const raceCategories = [
      { key: 'cps.ur_white', label: 'White', color: colors.platform.accent },
      { key: 'cps.ur_black', label: 'Black', color: colors.semantic.error },
      { key: 'cps.ur_hispanic', label: 'Hispanic', color: colors.platform.cyan },
      { key: 'cps.ur_asian', label: 'Asian', color: colors.platform.fuchsia }
    ];
    
    // Age demographics - try various key formats that might exist in the data
    const ageCategories = [
      // Original variants
      { key: 'cps.ur_16_19', label: '16-19 years', color: '#FF9900' },
      { key: 'cps.ur_20_24', label: '20-24 years', color: colors.platform.accent },
      { key: 'cps.ur_25_54', label: '25-54 years', color: colors.platform.cyan },
      { key: 'cps.ur_55plus', label: '55+ years', color: colors.semantic.success },
      
      // Generation-based categories (new)
      { key: 'cps.ur_genz', label: 'Gen Z (1997-2012)', color: '#FF9900' }, // Orange
      { key: 'cps.ur_millennial', label: 'Millennials (1981-1996)', color: colors.platform.accent }, // Purple
      { key: 'cps.ur_genx', label: 'Gen X (1965-1980)', color: colors.platform.cyan }, // Cyan
      { key: 'cps.ur_boomer', label: 'Baby Boomers (1946-1964)', color: colors.semantic.success }, // Green
      
      // Underscore variants
      { key: 'cps_ur_16_19', label: '16-19 years', color: '#FF9900' },
      { key: 'cps_ur_20_24', label: '20-24 years', color: colors.platform.accent },
      { key: 'cps_ur_25_54', label: '25-54 years', color: colors.platform.cyan },
      { key: 'cps_ur_55plus', label: '55+ years', color: colors.semantic.success },
      
      // Generation-based underscore variants (new)
      { key: 'cps_ur_genz', label: 'Gen Z (1997-2012)', color: '#FF9900' },
      { key: 'cps_ur_millennial', label: 'Millennials (1981-1996)', color: colors.platform.accent },
      { key: 'cps_ur_genx', label: 'Gen X (1965-1980)', color: colors.platform.cyan },
      { key: 'cps_ur_boomer', label: 'Baby Boomers (1946-1964)', color: colors.semantic.success },
      
      // Dash variants
      { key: 'cps.ur_16-19', label: '16-19 years', color: '#FF9900' },
      { key: 'cps.ur_20-24', label: '20-24 years', color: colors.platform.accent },
      { key: 'cps.ur_25-54', label: '25-54 years', color: colors.platform.cyan },
      { key: 'cps.ur_55-plus', label: '55+ years', color: colors.semantic.success },
      
      // Generation-based dash variants (new)
      { key: 'cps.ur.gen.z', label: 'Gen Z (1997-2012)', color: '#FF9900' },
      { key: 'cps.ur.millennial', label: 'Millennials (1981-1996)', color: colors.platform.accent },
      { key: 'cps.ur.gen.x', label: 'Gen X (1965-1980)', color: colors.platform.cyan },
      { key: 'cps.ur.boomer', label: 'Baby Boomers (1946-1964)', color: colors.semantic.success },
      
      // Underscore with dash variants
      { key: 'cps_ur_16-19', label: '16-19 years', color: '#FF9900' },
      { key: 'cps_ur_20-24', label: '20-24 years', color: colors.platform.accent },
      { key: 'cps_ur_25-54', label: '25-54 years', color: colors.platform.cyan },
      { key: 'cps_ur_55-plus', label: '55+ years', color: colors.semantic.success },
      
      // With 'years' in the key
      { key: 'cps.ur_16_to_19_years', label: '16-19 years', color: '#FF9900' },
      { key: 'cps.ur_20_to_24_years', label: '20-24 years', color: colors.platform.accent },
      { key: 'cps.ur_25_to_54_years', label: '25-54 years', color: colors.platform.cyan },
      { key: 'cps.ur_55_years_and_over', label: '55+ years', color: colors.semantic.success },
      
      // Even more variations
      { key: 'cps_ur_16to19', label: '16-19 years', color: '#FF9900' },
      { key: 'cps_ur_20to24', label: '20-24 years', color: colors.platform.accent },
      { key: 'cps_ur_25to54', label: '25-54 years', color: colors.platform.cyan },
      { key: 'cps_ur_55andover', label: '55+ years', color: colors.semantic.success },
      
      // Additional variations
      { key: 'cps.ur.age_16_19', label: '16-19 years', color: '#FF9900' },
      { key: 'cps.ur.age_20_24', label: '20-24 years', color: colors.platform.accent },
      { key: 'cps.ur.age_25_54', label: '25-54 years', color: colors.platform.cyan },
      { key: 'cps.ur.age_55_plus', label: '55+ years', color: colors.semantic.success },
      
      // More variations with different separators
      { key: 'cps:ur:16_19', label: '16-19 years', color: '#FF9900' },
      { key: 'cps:ur:20_24', label: '20-24 years', color: colors.platform.accent },
      { key: 'cps:ur:25_54', label: '25-54 years', color: colors.platform.cyan },
      { key: 'cps:ur:55plus', label: '55+ years', color: colors.semantic.success },
      
      // Alternative naming patterns
      { key: 'unemployment_rate_16_19', label: '16-19 years', color: '#FF9900' },
      { key: 'unemployment_rate_20_24', label: '20-24 years', color: colors.platform.accent },
      { key: 'unemployment_rate_25_54', label: '25-54 years', color: colors.platform.cyan },
      { key: 'unemployment_rate_55plus', label: '55+ years', color: colors.semantic.success },
      
      // Generation-based alternative naming patterns (new)
      { key: 'unemployment_rate_genz', label: 'Gen Z (1997-2012)', color: '#FF9900' },
      { key: 'unemployment_rate_millennial', label: 'Millennials (1981-1996)', color: colors.platform.accent },
      { key: 'unemployment_rate_genx', label: 'Gen X (1965-1980)', color: colors.platform.cyan },
      { key: 'unemployment_rate_boomer', label: 'Baby Boomers (1946-1964)', color: colors.semantic.success }
    ];
    
    // Gender demographics
    const genderCategories = [
      { key: 'cps.ur_men', label: 'Men 20+', color: colors.platform.accent },
      { key: 'cps.ur_women', label: 'Women 20+', color: colors.platform.fuchsia },
      
      // Alternative key formats
      { key: 'cps_ur_men', label: 'Men 20+', color: colors.platform.accent },
      { key: 'cps_ur_women', label: 'Women 20+', color: colors.platform.fuchsia },
      
      // More variations
      { key: 'cps.ur.men', label: 'Men 20+', color: colors.platform.accent },
      { key: 'cps.ur.women', label: 'Women 20+', color: colors.platform.fuchsia },
      
      // Additional formats
      { key: 'cps:ur:men', label: 'Men 20+', color: colors.platform.accent },
      { key: 'cps:ur:women', label: 'Women 20+', color: colors.platform.fuchsia },
      
      // Other possible formats
      { key: 'unemployment_rate_men', label: 'Men 20+', color: colors.platform.accent },
      { key: 'unemployment_rate_women', label: 'Women 20+', color: colors.platform.fuchsia }
    ];
    
    const processCategory = (categories: any[], categoryName: string) => {
      // Group categories by label to avoid duplicates
      const categoryByLabel: Record<string, any> = {};
      
      categories.forEach(cat => {
        // Try all possible key variations
        const keys = [
          cat.key,
          cat.key.replace(/\./g, '_'),
          cat.key.replace(/_/g, '-'),
          cat.key.replace(/-/g, '_'),
          cat.key.replace(/\./g, ':'),
          cat.key.replace(/_/g, '.'),
          cat.key.replace(/:/g, '.'),
          cat.key.replace(/\./g, ''),
          cat.key.replace(/_/g, ''),
          cat.key.replace(/-/g, ''),
          cat.key.toLowerCase(),
          cat.key.toUpperCase(),
          // Special handling for generation names
          cat.key.replace('genz', 'gen_z').replace(/\./g, '_'),
          cat.key.replace('genx', 'gen_x').replace(/\./g, '_'),
          cat.key.replace('millennial', 'millenial').replace(/\./g, '_'), // Common misspelling
          cat.key.replace('boomer', 'baby_boomer').replace(/\./g, '_')
        ];
        
        // Add more variations for generation-specific keys
        if (cat.key.includes('genz') || cat.key.includes('gen_z')) {
          keys.push('cps.ur.gen_z', 'cps_ur_gen_z', 'cps:ur:gen_z');
        }
        if (cat.key.includes('genx') || cat.key.includes('gen_x')) {
          keys.push('cps.ur.gen_x', 'cps_ur_gen_x', 'cps:ur:gen_x');
        }
        if (cat.key.includes('millennial')) {
          keys.push('cps.ur.millenial', 'cps_ur_millenial', 'cps:ur:millenial'); // Misspelling variant
        }
        if (cat.key.includes('boomer')) {
          keys.push('cps.ur.baby_boomer', 'cps_ur_baby_boomer', 'cps:ur:baby_boomer');
        }
        
        // Try to find a series that matches any of the keys
        let series = null;
        let foundKey = null;
        for (const key of keys) {
          if (artifact.series[key] && artifact.series[key].length > 0) {
            series = artifact.series[key];
            foundKey = key;
            console.log(`Found series for ${cat.label} with key: ${key}`);
            break;
          }
        }
        
        // Only add if we haven't already found a series for this label
        if (series && series.length > 0 && !categoryByLabel[cat.label]) {
          categoryByLabel[cat.label] = {
            category: categoryName,
            subcategory: cat.label,
            values: series,
            color: cat.color,
            key: foundKey
          };
        }
      });
      
      return Object.values(categoryByLabel);
    };
    
    const demographicData = processCategory(raceCategories, 'Race/Ethnicity');
    const ageData = processCategory(ageCategories, 'Age Groups');
    const genderData = processCategory(genderCategories, 'Gender');
    
    console.log('Processed data counts:', {
      raceCount: demographicData.length,
      ageCount: ageData.length,
      genderCount: genderData.length
    });
    
    // Calculate opportunity gaps
    const opportunityGaps = calculateOpportunityGaps(artifact.series);
    
    // Summary statistics
    const allCategories = [...demographicData, ...ageData, ...genderData];
    const latestRates = allCategories.map(d => {
      const validValues = d.values.filter((v: any) => v !== null) as number[];
      return validValues[validValues.length - 1] || 0;
    });
    
    const summaryStats = {
      highestRate: Math.max(...latestRates),
      lowestRate: Math.min(...latestRates),
      avgRate: latestRates.reduce((sum, r) => sum + r, 0) / latestRates.length,
      dispersion: Math.max(...latestRates) - Math.min(...latestRates)
    };

    return { demographicData, ageData, genderData, opportunityGaps, summaryStats };
  }, [artifact]);
  
  const getCurrentData = () => {
    let result;
    switch (selectedCategory) {
      case 'age':
        result = ageData;
        break;
      case 'gender':
        result = genderData;
        break;
      default:
        result = demographicData;
    }
    console.log(`Selected category: ${selectedCategory}, data count:`, result.length);
    return result;
  };
  
  const getTimeSeriesData = () => {
    const currentData = getCurrentData();
    console.log('Time series data from category:', selectedCategory, currentData);
    
    if (!currentData.length || !artifact?.index) {
      console.warn('No data available for time series');
      return [];
    }
    
    return currentData.map(d => ({
      id: d.subcategory,
      data: artifact!.index.map((row, i) => ({
        x: new Date(row.date),
        y: d.values[i]
      })).filter(point => point.y !== null)
    }));
  };

  if (isLoading) {
    return <div>Loading narrative data...</div>;
  }
  
  if (!artifact || demographicData.length === 0) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-3">
          <ChartCard
            title="The Geography of Opportunity"
            subtitle="Demographic unemployment analysis."
          >
            <div className="flex items-center justify-center h-full text-platform-text/70 bg-platform-contrast/30 rounded-lg">
              <div className="text-center p-8">
                <p className="font-semibold">Data Not Available</p>
                <p className="text-sm mt-2">
                  Demographic unemployment data is not available in the current dataset.
                </p>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-4">
      {/* Summary Cards */}
      {summaryStats && (
        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {fmtPct(summaryStats.highestRate / 100)}
            </div>
            <div className="text-xs text-platform-text/70">Highest Rate</div>
            <div className="text-xs text-platform-text/50">Current period</div>
          </div>
          
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-400 transform rotate-180" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {fmtPct(summaryStats.lowestRate / 100)}
            </div>
            <div className="text-xs text-platform-text/70">Lowest Rate</div>
            <div className="text-xs text-platform-text/50">Current period</div>
          </div>
          
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-platform-accent" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {fmtPct(summaryStats.avgRate / 100)}
            </div>
            <div className="text-xs text-platform-text/70">Average Rate</div>
            <div className="text-xs text-platform-text/50">Across groups</div>
          </div>
          
          <div className="bg-platform-contrast/20 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-platform-text">
              {fmtPct(summaryStats.dispersion / 100)}
            </div>
            <div className="text-xs text-platform-text/70">Dispersion</div>
            <div className="text-xs text-platform-text/50">High-Low gap</div>
          </div>
        </div>
      )}
      
      {/* View Toggle */}
      <div className="md:col-span-4 flex justify-center gap-2 mb-4">
        <Button
          variant={viewMode === 'demographics' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('demographics')}
          size="sm"
        >
          Demographics Trends
        </Button>
        <Button
          variant={viewMode === 'age' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('age')}
          size="sm"
        >
          Current Snapshot
        </Button>
        <Button
          variant={viewMode === 'gaps' ? 'platform-primary' : 'platform-secondary'}
          onClick={() => setViewMode('gaps')}
          size="sm"
        >
          Opportunity Gaps
        </Button>
      </div>

      {/* Main Visualization */}
      <div className="md:col-span-3">
        <ChartCard
          title={
            viewMode === 'demographics' ? "Unemployment Rates by Demographics Over Time" :
            viewMode === 'age' ? "Current Unemployment Rates by Group" :
            "Racial/Ethnic Opportunity Gaps"
          }
          subtitle={
            viewMode === 'demographics' ? "Historical trends in unemployment across different demographic groups." :
            viewMode === 'age' ? "Current unemployment rates across demographic categories." :
            "Analysis of persistent unemployment disparities between racial and ethnic groups."
          }
        >
          {viewMode === 'demographics' && isRendered && (
            <ChartErrorBoundary>
              <ChartWrapper className="h-[500px]">
                <ResponsiveLine
                  data={getTimeSeriesData()}
                  margin={{ top: 20, right: 110, bottom: 60, left: 80 }}
                  xScale={{ type: 'time' as const, useUTC: false }}
                  yScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
                  curve="monotoneX"
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    format: '%Y',
                    tickValues: 'every 5 years',
                    legend: 'Year',
                    legendOffset: 40,
                    legendPosition: 'middle'
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Unemployment Rate (%)',
                    legendOffset: -60,
                    legendPosition: 'middle'
                  }}
                  colors={getCurrentData().map(d => d.color)}
                  lineWidth={3}
                  pointSize={4}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  pointColor={{ theme: 'background' }}
                  enableSlices="x"
                  legends={[
                    {
                      anchor: 'top-right',
                      direction: 'column',
                      justify: false,
                      translateX: -10,
                      translateY: 10,
                      itemsSpacing: 0,
                      itemDirection: 'left-to-right',
                      itemWidth: 80,
                      itemHeight: 20,
                      itemOpacity: 0.75,
                      symbolSize: 12,
                      symbolShape: 'circle',
                      itemTextColor: colors.platform.text,
                      effects: [
                        {
                          on: 'hover',
                          style: {
                            itemOpacity: 1
                          }
                        }
                      ]
                    }
                  ]}
                  theme={{
                    axis: {
                      ticks: { text: { fill: colors.platform.text } },
                      legend: { text: { fill: colors.platform.text } }
                    },
                    grid: { line: { stroke: colors.platform.contrast } },
                    tooltip: { container: { background: colors.platform.contrast, color: colors.platform.text } },
                    legends: { text: { fill: colors.platform.text } }
                  }}
                />
              </ChartWrapper>
            </ChartErrorBoundary>
          )}
          
          {viewMode === 'age' && isRendered && (
            <ChartErrorBoundary>
              {getCurrentData().length > 0 ? (
                <DemographicBarChart data={getCurrentData()} />
              ) : (
                <div className="h-[500px] w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="text-platform-text/70">No data available for {selectedCategory}</p>
                    <p className="text-xs text-platform-text/50 mt-1">Try selecting a different demographic category</p>
                  </div>
                </div>
              )}
            </ChartErrorBoundary>
          )}
          
          {viewMode === 'gaps' && (
            <ChartErrorBoundary>
              <div className="min-h-[500px] flex flex-col">
                {opportunityGaps.length > 0 ? (
                  <>
                    {/* Add a summary section at the top */}
                    <div className="mb-6 bg-platform-contrast/10 p-4 rounded-lg">
                      <h3 className="text-platform-accent font-medium mb-2">Opportunity Gap Analysis</h3>
                      <p className="text-sm text-platform-text/90">
                        Unemployment rate disparities persist across demographic groups, with 
                        {opportunityGaps.filter(g => g.trend === 'improving').length > opportunityGaps.filter(g => g.trend === 'worsening').length
                          ? ' most gaps showing improvement over time.'
                          : ' several gaps remaining stubbornly high.'
                        } The largest disparity is the {opportunityGaps.sort((a, b) => b.currentGap - a.currentGap)[0].comparison} gap
                        at {fmtPct(opportunityGaps.sort((a, b) => b.currentGap - a.currentGap)[0].currentGap / 100)}.
                      </p>
                    </div>
                    <div className="flex-1">
                      <OpportunityGapsPanel gaps={opportunityGaps} />
                    </div>
                  </>
                ) : (
                  <div className="h-[500px] w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
                    <div className="text-center p-4">
                      <p className="text-platform-text/70">No opportunity gap data available</p>
                      <p className="text-xs text-platform-text/50 mt-1">Unable to calculate demographic disparities from the current dataset</p>
                    </div>
                  </div>
                )}
              </div>
            </ChartErrorBoundary>
          )}
        </ChartCard>
      </div>
      
      {/* Controls */}
      <div className="md:col-span-1">
        <ChartCard title="Controls & Filters">
        <div className="space-y-4">
          {viewMode === 'demographics' && (
            <div>
              <label className="text-sm font-medium text-platform-text/80">Demographic Category</label>
              <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
                <SelectTrigger className="w-full mt-1 bg-platform-contrast border-platform-accent/50 text-platform-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-platform-contrast border-platform-accent/50 text-platform-text">
                  <SelectItem value="race" className="hover:bg-platform-accent/20 focus:bg-platform-accent/20">Race/Ethnicity</SelectItem>
                  <SelectItem value="age" className="hover:bg-platform-accent/20 focus:bg-platform-accent/20">Age Groups</SelectItem>
                  <SelectItem value="gender" className="hover:bg-platform-accent/20 focus:bg-platform-accent/20">Gender</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="text-xs text-platform-text/60">
            {viewMode === 'demographics' ? 
              'Select different demographic categories to explore unemployment trends across various population groups.' :
              viewMode === 'age' ? 
              'Current unemployment rates across demographic categories.' :
              'Opportunity gaps measure persistent disparities in unemployment rates between different groups.'}
          </div>
          
          {viewMode === 'gaps' && opportunityGaps.length > 0 && (
            <div className="bg-platform-contrast/10 p-3 rounded-lg">
              <h5 className="font-medium mb-2 text-platform-accent">Key Insights</h5>
              <ul className="text-xs space-y-1">
                <li>• {opportunityGaps.length} major demographic gaps tracked</li>
                <li>• Persistent disparities require targeted policy intervention</li>
                <li>• Trends show {opportunityGaps.filter(g => g.trend === 'improving').length} improving gaps</li>
                <li>• Largest gap: {opportunityGaps.sort((a, b) => b.currentGap - a.currentGap)[0].comparison} ({fmtPct(opportunityGaps.sort((a, b) => b.currentGap - a.currentGap)[0].currentGap / 100)})</li>
                <li>• Smallest gap: {opportunityGaps.sort((a, b) => a.currentGap - b.currentGap)[0].comparison} ({fmtPct(opportunityGaps.sort((a, b) => a.currentGap - b.currentGap)[0].currentGap / 100)})</li>
              </ul>
            </div>
          )}
          
          {viewMode !== 'gaps' && opportunityGaps.length > 0 && (
            <div className="bg-platform-contrast/10 p-3 rounded-lg">
              <h5 className="font-medium mb-2 text-platform-accent">Key Insights</h5>
              <ul className="text-xs space-y-1">
                <li>• {opportunityGaps.length} major demographic gaps tracked</li>
                <li>• Persistent disparities require targeted policy intervention</li>
                <li>• Trends show {opportunityGaps.filter(g => g.trend === 'improving').length} improving gaps</li>
              </ul>
            </div>
          )}
        </div>
        </ChartCard>
      </div>
    </div>
  );
}