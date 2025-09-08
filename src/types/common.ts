// Core time series values
export interface SeriesValue {
  nominal: number; // USD (current dollars)
  real?: number; // CPI-adjusted (base year documented)
  pctGDP?: number; // Share of GDP
}

export type Year = number; // fiscal year, e.g., 1930..2035