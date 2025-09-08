// Oct–Sep for FY1977+, Jul–Jun earlier
export function monthToFY(isoMonth: string): { fy: number; fyMonth: number } {
  const [y, m] = isoMonth.split('-').map(Number);
  const cutoff = 1976; // The transition quarter was in 1976. FY77 started Oct 1976.
  if (y > cutoff || (y === cutoff && m >= 10)) {
    const fy = m >= 10 ? y + 1 : y;
    const fyMonth = m >= 10 ? m - 9 : m + 3; // Oct=1 ... Sep=12
    return { fy, fyMonth };
  }
  const fy = m >= 7 ? y + 1 : y;
  const fyMonth = m >= 7 ? m - 6 : m + 6; // Jul=1 ... Jun=12
  return { fy, fyMonth };
}