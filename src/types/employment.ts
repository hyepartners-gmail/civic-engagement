export type Unit = 'persons_thous' | 'rate_pct' | 'usd' | 'usd_2024' | 'ratio' | 'count';

export interface SeriesMeta {
  id: string;
  name: string;
  unit: Unit;
  sa: boolean;
  source: 'BLS' | 'BEA' | 'NBER';
  notes?: string;
  coverage?: { start: string; end?: string };
}

export interface IndexRow {
  date: string; // YYYY-MM-DD
  fy: number;
  fyMonth: number;
  period_type: 'month' | 'fiscal_year';
}

export interface EmploymentArtifact {
  index: IndexRow[];
  series: Record<string, (number | null)[]>;
  derived?: Record<string, any>; // Add derived data field
  units: Record<string, Unit>;
  meta: { notes: string[]; created_at: string; version: string };
}

export interface Recession {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface GdpData {
  year: number;
  gdp_growth_pct: number;
}