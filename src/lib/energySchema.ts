import { z } from 'zod';

// Schema for individual power plant data
export const plantSchema = z.object({
  plant_id: z.number(),
  plant_name: z.string(),
  state: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  fuel_type: z.string(),
  capacity_mw: z.number(),
  annual_net_gen_mwh: z.number().nullable(),
  co2_tons: z.number().nullable(),
  co2_intensity_kg_mwh: z.number().nullable(),
  operator: z.string().nullable(),
  online_year: z.number().nullable(),
});

export type Plant = z.infer<typeof plantSchema>; // Export the Plant type

// Schema for the aggregated state-level power plant data
export const stateEnergySchema = z.object({
  state: z.string(),
  plant_count: z.number(),
  capacity_mw: z.number(),
  annual_net_gen_mwh: z.number(),
  annual_co2_tons: z.number(),
  annual_nox_tons: z.number(),
  annual_so2_tons: z.number(),
  annual_ch4_lbs: z.number(),
  annual_n2o_lbs: z.number(),
  annual_co2e_tons: z.number(),
  counts_by_fuel: z.record(z.string(), z.number()),
  capacity_by_fuel_mw: z.record(z.string(), z.number()),
  netgen_by_fuel_mwh: z.record(z.string(), z.number()),
  emissions_by_fuel: z.record(z.string(), z.object({
    annual_co2_tons: z.number(),
    annual_nox_tons: z.number(),
    annual_so2_tons: z.number(),
    annual_ch4_lbs: z.number(),
    annual_n2o_lbs: z.number(),
    annual_co2e_tons: z.number(),
  })),
  // Optional coordinates field for backward compatibility
  coordinates: z.array(z.array(z.number())).optional(),
  coordinates_by_fuel: z.record(z.string(), z.array(z.array(z.number()))).optional(),
});

export const energySchema = z.array(stateEnergySchema);

export type StateEnergyData = z.infer<typeof stateEnergySchema>;
export type EnergyData = z.infer<typeof energySchema>;