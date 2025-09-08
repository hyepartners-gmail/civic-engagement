import { MacroSeries } from "@/types";
import { Year } from "@/types/common";

const BASE_YEAR = parseInt(process.env.NEXT_PUBLIC_BASE_CPI_YEAR || '2025', 10);

export function toRealUSD(nominal: number, year: Year, macro: MacroSeries): number {
  const baseCpi = macro.cpi[BASE_YEAR];
  const yearCpi = macro.cpi[year];
  if (!baseCpi || !yearCpi) return nominal;
  return nominal * (baseCpi / yearCpi);
}

export function toPctGDP(nominal: number, year: Year, macro: MacroSeries): number {
  const gdp = macro.gdp[year];
  if (!gdp) return 0;
  return nominal / gdp;
}