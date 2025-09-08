import React from 'react';
import { render } from '@testing-library/react';
import HotNightsWildfireChart from '@/components/charts/HotNightsWildfireChart';

// Mock the recharts components
jest.mock('recharts', () => ({
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  Line: ({ dataKey, name }: any) => <div data-testid={`line-${dataKey}`} data-name={name} />,
  Area: ({ dataKey, name }: any) => <div data-testid={`area-${dataKey}`} data-name={name} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('HotNightsWildfireChart', () => {
  const mockWarmNightsData = [
    { year: 2000, nights: 45 },
    { year: 2001, nights: 48 },
    { year: 2002, nights: 52 },
  ];

  const mockWildfireData = [
    { year: 2000, acres: 15000 },
    { year: 2001, acres: 22000 },
    { year: 2002, acres: 18500 },
  ];

  const mockFemaData = [
    { year: 2000, events: 2 },
    { year: 2001, events: 1 },
    { year: 2002, events: 3 },
  ];

  it('renders chart with correct layering order', () => {
    const { getByTestId } = render(
      <HotNightsWildfireChart
        warmNightsData={mockWarmNightsData}
        wildfireData={mockWildfireData}
        femaData={mockFemaData}
        threshold={70}
        wildfireScope="national"
      />
    );

    expect(getByTestId('composed-chart')).toBeInTheDocument();
    expect(getByTestId('area-acres')).toBeInTheDocument();
    expect(getByTestId('line-nights')).toBeInTheDocument();
    expect(getByTestId('line-events')).toBeInTheDocument();
    expect(getByTestId('x-axis')).toBeInTheDocument();
    expect(getByTestId('y-axis')).toBeInTheDocument();
    expect(getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(getByTestId('tooltip')).toBeInTheDocument();
    expect(getByTestId('legend')).toBeInTheDocument();
  });

  it('renders chart without FEMA data when empty', () => {
    const { getByTestId, queryByTestId } = render(
      <HotNightsWildfireChart
        warmNightsData={mockWarmNightsData}
        wildfireData={mockWildfireData}
        femaData={[]}
        threshold={70}
        wildfireScope="national"
      />
    );

    expect(getByTestId('composed-chart')).toBeInTheDocument();
    expect(getByTestId('area-acres')).toBeInTheDocument();
    expect(getByTestId('line-nights')).toBeInTheDocument();
    expect(queryByTestId('line-events')).not.toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(
      <HotNightsWildfireChart
        warmNightsData={mockWarmNightsData}
        wildfireData={mockWildfireData}
        femaData={mockFemaData}
        threshold={70}
        wildfireScope="national"
      />
    );

    expect(container).toMatchSnapshot();
  });
});