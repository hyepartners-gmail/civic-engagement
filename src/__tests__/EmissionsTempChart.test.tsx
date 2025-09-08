import { render } from '@testing-library/react';
import EmissionsTempChart from '@/components/charts/EmissionsTempChart';

// Mock the MilestonesOverlay component since it uses hooks
jest.mock('@/components/charts/MilestonesOverlay', () => {
  return function MockMilestonesOverlay() {
    return <div data-testid="milestones-overlay" />;
  };
});

describe('EmissionsTempChart', () => {
  const mockCo2Data = [
    { year: 2000, co2: 5500 },
    { year: 2001, co2: 5400 },
    { year: 2002, co2: 5300 }
  ];

  const mockAnomalyData = [
    { year: 2000, anomaly: 0.5 },
    { year: 2001, anomaly: 0.6 },
    { year: 2002, anomaly: 0.7 }
  ];

  it('should render the chart with per-capita mode', () => {
    const { container } = render(
      <EmissionsTempChart
        co2Data={mockCo2Data}
        anomalyData={mockAnomalyData}
        mode="percap"
        anomalySource="global"
        showMilestones={true}
      />
    );

    expect(container).toMatchSnapshot();
  });

  it('should render the chart with total mode', () => {
    const { container } = render(
      <EmissionsTempChart
        co2Data={mockCo2Data}
        anomalyData={mockAnomalyData}
        mode="total"
        anomalySource="us"
        showMilestones={false}
      />
    );

    expect(container).toMatchSnapshot();
  });

  it('should render milestones when showMilestones is true', () => {
    const { getByTestId } = render(
      <EmissionsTempChart
        co2Data={mockCo2Data}
        anomalyData={mockAnomalyData}
        mode="percap"
        anomalySource="global"
        showMilestones={true}
      />
    );

    expect(getByTestId('milestones-overlay')).toBeInTheDocument();
  });
});