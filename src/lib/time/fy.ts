// Assuming a standard US federal fiscal year (Oct 1 - Sep 30)

/**
 * Converts a calendar year and month to a fiscal year.
 * @param calendarYear The calendar year (e.g., 2023).
 * @param month The month (1-12).
 * @returns The corresponding fiscal year.
 */
export function toFiscalYear(calendarYear: number, month: number): number {
  // If the month is October, November, or December, the fiscal year is the next calendar year.
  return month >= 10 ? calendarYear + 1 : calendarYear;
}

/**
 * Converts a Date object to a fiscal year.
 * @param date The Date object.
 * @returns The corresponding fiscal year.
 */
export function dateToFiscalYear(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() is 0-indexed
  return toFiscalYear(year, month);
}

/**
 * Converts a series of [year, value] pairs to fiscal years based on the fiscal year specification.
 * @param series The series of [year, value] pairs.
 * @param fySpec The fiscal year specification (e.g., 'oct-sep' for Oct 1 - Sep 30).
 * @returns The series with years converted to fiscal years.
 */
export function toFiscalYears(series: [number, number | null][], fySpec: string = 'oct-sep'): [number, number | null][] {
  // For now, we only support the standard US federal fiscal year (Oct 1 - Sep 30)
  if (fySpec !== 'oct-sep') {
    console.warn(`Unsupported fiscal year specification: ${fySpec}. Using default oct-sep.`);
  }

  return series.map(([year, value]) => {
    // For annual data, we map the calendar year to the fiscal year that contains
    // the majority of that calendar year's data (Oct - Sep of the same year)
    const fiscalYear = year;
    return [fiscalYear, value];
  });
}