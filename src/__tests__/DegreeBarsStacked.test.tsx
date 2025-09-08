import React from 'react';
import { render } from '@testing-library/react';
import DegreeBarsStacked from '@/components/charts/DegreeBarsStacked';

// Mock the recharts components
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ dataKey, name, fill }: any) => <div data-testid={`bar-${dataKey}`} data-name={name} data-fill={fill} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('DegreeBarsStacked', () => {
  const mockData = [
    { year: 2000, hdd: 1000, cdd: 2000 },
    { year: 2001, hdd: 950, cdd: 2100 },
    { year: 2002, hdd: 900, cdd: 2200 },
  ];

  it('renders stacked bars with both HDD and CDD visible', () => {
    const { getByTestId } = render(
      <DegreeBarsStacked data={mockData} showHdd={true} showCdd={true} />
    );

    expect(getByTestId('bar-chart')).toBeInTheDocument();
    expect(getByTestId('bar-hdd')).toBeInTheDocument();
    expect(getByTestId('bar-cdd')).toBeInTheDocument();
    expect(getByTestId('x-axis')).toBeInTheDocument();
    expect(getByTestId('y-axis')).toBeInTheDocument();
    expect(getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(getByTestId('tooltip')).toBeInTheDocument();
    expect(getByTestId('legend')).toBeInTheDocument();
  });

  it('renders only HDD when CDD is hidden', () => {
    const { getByTestId, queryByTestId } = render(
      <DegreeBarsStacked data={mockData} showHdd={true} showCdd={false} />
    );

    expect(getByTestId('bar-hdd')).toBeInTheDocument();
    expect(queryByTestId('bar-cdd')).not.toBeInTheDocument();
  });

  it('renders only CDD when HDD is hidden', () => {
    const { getByTestId, queryByTestId } = render(
      <DegreeBarsStacked data={mockData} showHdd={false} showCdd={true} />
    );

    expect(getByTestId('bar-cdd')).toBeInTheDocument();
    expect(queryByTestId('bar-hdd')).not.toBeInTheDocument();
  });

  it('renders responsive container', () => {
    const { getByTestId } = render(
      <DegreeBarsStacked data={mockData} showHdd={true} showCdd={true} />
    );

    expect(getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(
      <DegreeBarsStacked data={mockData} showHdd={true} showCdd={true} />
    );

    expect(container).toMatchSnapshot();
  });
});