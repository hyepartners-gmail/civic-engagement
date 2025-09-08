export const flags = {
  validateData: process.env.NEXT_PUBLIC_VALIDATE_DATA === '1',
  enableWorkers: true,
  charts: 'nivo' as 'nivo'|'recharts'
};