import { z } from 'zod';
import { climateSchema } from '@/lib/climateSchema';

export type ClimateArtifact = z.infer<typeof climateSchema>;