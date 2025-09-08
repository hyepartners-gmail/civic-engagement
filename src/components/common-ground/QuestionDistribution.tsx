'use client';

import { Question } from '@/types/common-ground';
import { ResponsiveBar } from '@nivo/bar';
import { colors } from '@/lib/theme';

interface QuestionDistributionProps {
  distribution: {
    questionId: string;
    prompt: string;
    counts: { optionId: string; label: string; count: number }[];
  };
}

export default function QuestionDistribution({ distribution }: QuestionDistributionProps) {
  const data = distribution.counts.map(c => ({
    id: c.label,
    value: c.count,
  }));

  return (
    <div>
      <h5 className="font-semibold text-sm mb-2">{distribution.prompt}</h5>
      <div className="h-48">
        <ResponsiveBar
          data={data}
          keys={['value']}
          indexBy="id"
          margin={{ top: 10, right: 10, bottom: 20, left: 30 }}
          padding={0.3}
          layout="horizontal"
          valueScale={{ type: 'linear' as const }}
          indexScale={{ type: 'band' as const, round: true }}
          colors={colors.platform.accent}
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0 }}
          axisLeft={{ tickSize: 0, tickPadding: 5, tickRotation: 0 }}
          enableGridY={false}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
          theme={{
            axis: { ticks: { text: { fill: colors.platform.text, fontSize: 10 } } },
            tooltip: { container: { background: colors.platform.contrast, color: colors.platform.text } },
          }}
        />
      </div>
    </div>
  );
}