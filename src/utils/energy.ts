import { FuelType } from '@/hooks/useEnergyState';

export const getFuelColor = (fuelType: FuelType | string): string => {
  switch (fuelType) {
    case 'Coal': return '#594338'; // Brown
    case 'Natural Gas': return '#FF6347'; // Tomato
    case 'Nuclear': return '#4CAF50'; // Green
    case 'Hydro': return '#1E90FF'; // DodgerBlue
    case 'Wind': return '#00CED1'; // DarkTurquoise
    case 'Solar': return '#FFD700'; // Gold
    default: return '#A9A9A9'; // DarkGray
  }
};