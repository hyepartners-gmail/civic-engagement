import { z } from 'zod';

// A safe coercion utility for numbers from strings or other types
export const safeCoerceNumber = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? undefined : parsed;
    }
    if (typeof val === 'number') {
      return val;
    }
    return undefined;
  },
  z.number()
);

// A safe coercion for booleans from strings like "true" or "false"
export const safeCoerceBoolean = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true') return true;
      if (val.toLowerCase() === 'false') return false;
    }
    if (typeof val === 'boolean') {
      return val;
    }
    return undefined;
  },
  z.boolean()
);