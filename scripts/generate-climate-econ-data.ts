#!/usr/bin/env ts-node

/**
 * Script to generate sample climate economic data for the "When Heat Meets the Economy" story
 * This script creates placeholder data that follows the structure defined in climate_econ_artifact.json
 */

import * as fs from 'fs';
import * as path from 'path';

// Define the structure of our climate economic data
interface ClimateEconProxyData {
  year: number;
  idx: number;
}

interface ClimateTempAnomalyData {
  year: number;
  anomaly_c: number;
}

interface ClimateEconStateData {
  name: string;
  temps: {
    summerAnomaly: ClimateTempAnomalyData[];
  };
  econProxies: {
    construction_hours_index: ClimateEconProxyData[];
    ag_yield_proxy: ClimateEconProxyData[];
    electric_load_proxy: ClimateEconProxyData[];
  };
}

interface ClimateEconMetadataProxy {
  description: string;
  unit: string;
  source: string;
  transform: string;
}

interface ClimateEconMetadata {
  title: string;
  description: string;
  version: string;
  lastUpdated: string;
  sources: {
    temperature: string;
    construction: string;
    agriculture: string;
    electricity: string;
  };
  proxies: {
    construction_hours_index: ClimateEconMetadataProxy;
    ag_yield_proxy: ClimateEconMetadataProxy;
    electric_load_proxy: ClimateEconMetadataProxy;
  };
}

interface ClimateEconArtifact {
  meta: ClimateEconMetadata;
  states: {
    [stateId: string]: ClimateEconStateData;
  };
}

// State names mapping
const stateNames: { [key: string]: string } = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "FL": "Florida",
  "GA": "Georgia",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PA": "Pennsylvania",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
};

// Generate sample data for a state
function generateStateData(stateId: string): ClimateEconStateData {
  const name = stateNames[stateId] || stateId;
  
  // Generate 30 years of data (1990-2019)
  const years = Array.from({ length: 30 }, (_, i) => 1990 + i);
  
  // Generate summer temperature anomalies with a slight warming trend
  const temps: ClimateTempAnomalyData[] = years.map((year, index) => {
    // Base trend: 0.02°C warming per year
    const trend = (year - 2000) * 0.02;
    // Add some random variation
    const variation = (Math.random() - 0.5) * 0.5;
    const anomaly_c = parseFloat((trend + variation).toFixed(2));
    
    return { year, anomaly_c };
  });
  
  // Generate construction hours index (negatively correlated with heat)
  const construction: ClimateEconProxyData[] = years.map((year, index) => {
    // Base value with inverse correlation to temperature
    const baseValue = 50 - temps[index].anomaly_c * 2;
    // Add some random variation
    const variation = (Math.random() - 0.5) * 10;
    const idx = Math.max(0, Math.min(100, parseFloat((baseValue + variation).toFixed(1))));
    
    return { year, idx };
  });
  
  // Generate agricultural yield proxy (negatively correlated with heat)
  const agYield: ClimateEconProxyData[] = years.map((year, index) => {
    // Base value with inverse correlation to temperature
    const baseValue = 50 - temps[index].anomaly_c * 1.5;
    // Add some random variation
    const variation = (Math.random() - 0.5) * 15;
    const idx = Math.max(0, Math.min(100, parseFloat((baseValue + variation).toFixed(1))));
    
    return { year, idx };
  });
  
  // Generate electric load proxy (positively correlated with heat)
  const electricLoad: ClimateEconProxyData[] = years.map((year, index) => {
    // Base value with positive correlation to temperature
    const baseValue = 50 + temps[index].anomaly_c * 3;
    // Add some random variation
    const variation = (Math.random() - 0.5) * 10;
    const idx = Math.max(0, Math.min(100, parseFloat((baseValue + variation).toFixed(1))));
    
    return { year, idx };
  });
  
  return {
    name,
    temps: {
      summerAnomaly: temps
    },
    econProxies: {
      construction_hours_index: construction,
      ag_yield_proxy: agYield,
      electric_load_proxy: electricLoad
    }
  };
}

// Generate the complete artifact
function generateClimateEconArtifact(): ClimateEconArtifact {
  const states: { [stateId: string]: ClimateEconStateData } = {};
  
  // Generate data for all states
  Object.keys(stateNames).forEach(stateId => {
    states[stateId] = generateStateData(stateId);
  });
  
  return {
    meta: {
      title: "Climate and Economic Proxies Artifact",
      description: "Correlation data between summer temperature anomalies and economic productivity proxies",
      version: "1.0.0",
      lastUpdated: new Date().toISOString().split('T')[0],
      sources: {
        temperature: "Berkeley Earth (city/state anomaly) or GHCN-derived summer (JJA) anomaly",
        construction: "BLS hours worked (Construction) or BEA GVA by industry",
        agriculture: "USDA crop yields for selected states/crops",
        electricity: "EIA balancing authorities"
      },
      proxies: {
        construction_hours_index: {
          description: "Normalized index of construction hours worked",
          unit: "index (0-100)",
          source: "BLS/BEA",
          transform: "z-score normalization"
        },
        ag_yield_proxy: {
          description: "Normalized proxy for agricultural yields",
          unit: "index (0-100)",
          source: "USDA",
          transform: "z-score normalization"
        },
        electric_load_proxy: {
          description: "Normalized proxy for regional electricity load",
          unit: "index (0-100)",
          source: "EIA",
          transform: "z-score normalization"
        }
      }
    },
    states
  };
}

// Main function
async function main() {
  try {
    console.log("Generating climate economic data...");
    
    // Generate the artifact
    const artifact = generateClimateEconArtifact();
    
    // Write to file
    const outputPath = path.join(__dirname, '..', 'public', 'climate', 'climate_econ_artifact.json');
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2));
    
    console.log(`Successfully generated climate economic data at: ${outputPath}`);
  } catch (error) {
    console.error("Error generating climate economic data:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { generateClimateEconArtifact };