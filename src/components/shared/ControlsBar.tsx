import React from 'react';
import CityPicker from '../controls/CityPicker';
import StatePicker from '../controls/StatePicker';
import MetricPicker from '../controls/MetricPicker';
import BasePeriodToggle from '../controls/BasePeriodToggle';
import FiscalYearToggle from '../controls/FiscalYearToggle';

interface ControlsBarProps {
  showCity?: boolean;
  showState?: boolean;
  showBasePeriod?: boolean;
  showFiscalYear?: boolean;
  defaultCity?: string;
}

export default function ControlsBar({ 
  showCity, 
  showState, 
  showBasePeriod, 
  showFiscalYear, 
  defaultCity 
}: ControlsBarProps) {
  return (
    <div className="bg-platform-contrast/50 backdrop-blur-sm p-4 rounded-lg border border-platform-contrast flex flex-wrap items-center gap-4">
      {showCity && <CityPicker />}
      {showState && <StatePicker />}
      {showBasePeriod && <BasePeriodToggle />}
      {showFiscalYear && <FiscalYearToggle />}
    </div>
  );
}