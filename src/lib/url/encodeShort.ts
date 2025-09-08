import { ClimateState as ClimateUrlState } from '@/hooks/useClimateState';

// City abbreviation mapping
const CITY_ABBR_MAP: Record<string, string> = {
  'seattle': 'SEA',
  'los-angeles': 'LAX',
  'chicago': 'CHI',
  'houston': 'HOU',
  'atlanta': 'ATL',
  'new-york': 'NYC'
};

const CITY_FULL_MAP: Record<string, string> = {
  'SEA': 'seattle',
  'LAX': 'los-angeles',
  'CHI': 'chicago',
  'HOU': 'houston',
  'ATL': 'atlanta',
  'NYC': 'new-york'
};

// Disaster type abbreviations
const DISASTER_ABBR_MAP: Record<string, string> = {
  'flood': 'F',
  'drought': 'D',
  'wildfire': 'WF',
  'winter-storm': 'WS',
  'severe-storm': 'SS',
  'hurricane': 'H'
};

const DISASTER_FULL_MAP: Record<string, string> = {
  'F': 'flood',
  'D': 'drought',
  'WF': 'wildfire',
  'WS': 'winter-storm',
  'SS': 'severe-storm',
  'H': 'hurricane'
};

// Degree day mode abbreviations
const DEGREE_DAY_ABBR_MAP: Record<string, string> = {
  'hdd': 'H',
  'cdd': 'C',
  'both': 'B'
};

const DEGREE_DAY_FULL_MAP: Record<string, string> = {
  'H': 'hdd',
  'C': 'cdd',
  'B': 'both'
};

// Cadence abbreviations
const CADENCE_ABBR_MAP: Record<string, string> = {
  'annual': 'A',
  'fiscal': 'F'
};

const CADENCE_FULL_MAP: Record<string, string> = {
  'A': 'annual',
  'F': 'fiscal'
};

// Base period abbreviations
const BASE_PERIOD_ABBR_MAP: Record<string, string> = {
  '1991-2020': '9120',
  '1951-1980': '5180',
  '20th-century': '20C'
};

const BASE_PERIOD_FULL_MAP: Record<string, string> = {
  '9120': '1991-2020',
  '5180': '1951-1980',
  '20C': '20th-century'
};

// CO2 mode abbreviations
const CO2_MODE_ABBR_MAP: Record<string, string> = {
  'per-capita': 'PC',
  'total': 'T'
};

const CO2_MODE_FULL_MAP: Record<string, string> = {
  'PC': 'per-capita',
  'T': 'total'
};

// Anomaly source abbreviations
const ANOMALY_SOURCE_ABBR_MAP: Record<string, string> = {
  'global': 'G',
  'national': 'N'
};

const ANOMALY_SOURCE_FULL_MAP: Record<string, string> = {
  'G': 'global',
  'N': 'national'
};

// Heat econ metric abbreviations
const HEAT_ECON_METRIC_ABBR_MAP: Record<string, string> = {
  'construction': 'C',
  'agriculture': 'A',
  'energy': 'E'
};

const HEAT_ECON_METRIC_FULL_MAP: Record<string, string> = {
  'C': 'construction',
  'A': 'agriculture',
  'E': 'energy'
};

// Heat econ fit abbreviations
const HEAT_ECON_FIT_ABBR_MAP: Record<string, string> = {
  'linear': 'L',
  'none': 'N'
};

const HEAT_ECON_FIT_FULL_MAP: Record<string, string> = {
  'L': 'linear',
  'N': 'none'
};

// Heat econ scope abbreviations
const HEAT_ECON_SCOPE_ABBR_MAP: Record<string, string> = {
  'city': 'C',
  'state': 'S'
};

const HEAT_ECON_SCOPE_FULL_MAP: Record<string, string> = {
  'C': 'city',
  'S': 'state'
};

// Cost mode abbreviations
const COST_MODE_ABBR_MAP: Record<string, string> = {
  'total': 'T',
  'per-capita': 'PC'
};

const COST_MODE_FULL_MAP: Record<string, string> = {
  'T': 'total',
  'PC': 'per-capita'
};

// Wildfire scope abbreviations
const WILDFIRE_SCOPE_ABBR_MAP: Record<string, string> = {
  'state': 'S',
  'national': 'N'
};

const WILDFIRE_SCOPE_FULL_MAP: Record<string, string> = {
  'S': 'state',
  'N': 'national'
};

export function encodeClimateStateShort(state: ClimateUrlState): string {
  const parts: string[] = [];
  
  // City (using abbreviation)
  if (state.city && state.city !== 'seattle') { // seattle is default
    const cityAbbr = CITY_ABBR_MAP[state.city] || state.city;
    parts.push(`c${cityAbbr}`);
  }
  
  // State ID (using abbreviation)
  if (state.state && state.state !== 'wa') { // wa is default
    parts.push(`s${state.state.toUpperCase()}`);
  }
  
  // Base period
  if (state.basePeriod && state.basePeriod !== '1991-2020') { // 1991-2020 is default
    const basePeriodAbbr = BASE_PERIOD_ABBR_MAP[state.basePeriod] || state.basePeriod;
    parts.push(`b${basePeriodAbbr}`);
  }
  
  // Cadence
  if (state.cadence && state.cadence !== 'annual') { // annual is default
    const cadenceAbbr = CADENCE_ABBR_MAP[state.cadence] || state.cadence;
    parts.push(`d${cadenceAbbr}`);
  }
  
  // Disaster types
  if (state.disasterTypes && state.disasterTypes.length > 0 && 
      !(state.disasterTypes.length === 4 && 
        state.disasterTypes.includes('flood') && 
        state.disasterTypes.includes('hurricane') && 
        state.disasterTypes.includes('wildfire') && 
        state.disasterTypes.includes('severe-storm'))) { // default is all 4
    const disasterAbbrs = state.disasterTypes.map(type => DISASTER_ABBR_MAP[type] || type);
    parts.push(`t${disasterAbbrs.join(',')}`);
  }
  
  // Per capita
  if (state.perCapita !== false) { // false is default
    parts.push(`p1`);
  }
  
  // Degree day mode
  if (state.degreeDayMode && state.degreeDayMode !== 'both') { // both is default
    const modeAbbr = DEGREE_DAY_ABBR_MAP[state.degreeDayMode] || state.degreeDayMode;
    parts.push(`dd${modeAbbr}`);
  }
  
  // CO2 smoothing
  if (state.co2Smoothing !== false) { // false is default
    parts.push(`cs1`);
  }
  
  // Normalize degree days
  if (state.normalizeDegreeDays !== false) { // false is default
    parts.push(`ndd1`);
  }
  
  // Wildfire scope
  if (state.wildfireScope && state.wildfireScope !== 'national') { // national is default
    const scopeAbbr = WILDFIRE_SCOPE_ABBR_MAP[state.wildfireScope] || state.wildfireScope;
    parts.push(`wf${scopeAbbr}`);
  }
  
  // Warm night threshold
  if (state.warmNightThreshold && state.warmNightThreshold !== 70) { // 70 is default
    parts.push(`wn${state.warmNightThreshold}`);
  }
  
  // CO2 mode
  if (state.co2Mode && state.co2Mode !== 'per-capita') { // per-capita is default
    const modeAbbr = CO2_MODE_ABBR_MAP[state.co2Mode] || state.co2Mode;
    parts.push(`cm${modeAbbr}`);
  }
  
  // Anomaly source
  if (state.anomalySource && state.anomalySource !== 'global') { // global is default
    const sourceAbbr = ANOMALY_SOURCE_ABBR_MAP[state.anomalySource] || state.anomalySource;
    parts.push(`as${sourceAbbr}`);
  }
  
  // Anomaly smoothing
  if (state.anomalySmoothing !== false) { // false is default
    parts.push(`asm1`);
  }
  
  // Selected cities
  if (state.selectedCities && state.selectedCities.length > 0 && 
      !(state.selectedCities.length === 6 && 
        state.selectedCities.includes('seattle') && 
        state.selectedCities.includes('los-angeles') && 
        state.selectedCities.includes('chicago') && 
        state.selectedCities.includes('houston') && 
        state.selectedCities.includes('atlanta') && 
        state.selectedCities.includes('new-york'))) { // default is all 6
    const cityAbbrs = state.selectedCities.map(city => CITY_ABBR_MAP[city] || city);
    parts.push(`sc${cityAbbrs.join(',')}`);
  }
  
  // Sync Y
  if (state.syncY !== true) { // true is default
    parts.push(`sy0`);
  }
  
  // Year range
  if (state.yearRange && 
      !(state.yearRange[0] === 1950 && state.yearRange[1] === 2023)) { // default is [1950, 2023]
    parts.push(`yr${state.yearRange[0]}-${state.yearRange[1]}`);
  }
  
  // Hot day threshold
  if (state.hotDayThreshold && state.hotDayThreshold !== 90) { // 90 is default
    parts.push(`ht${state.hotDayThreshold}`);
  }
  
  // Cost mode
  if (state.costMode && state.costMode !== 'total') { // total is default
    const modeAbbr = COST_MODE_ABBR_MAP[state.costMode] || state.costMode;
    parts.push(`cost${modeAbbr}`);
  }
  
  // Inflation adjust
  if (state.inflationAdjust !== true) { // true is default
    parts.push(`inf0`);
  }
  
  // Heat econ metric
  if (state.heatEconMetric && state.heatEconMetric !== 'construction') { // construction is default
    const metricAbbr = HEAT_ECON_METRIC_ABBR_MAP[state.heatEconMetric] || state.heatEconMetric;
    parts.push(`hem${metricAbbr}`);
  }
  
  // Heat econ fit
  if (state.heatEconFit && state.heatEconFit !== 'linear') { // linear is default
    const fitAbbr = HEAT_ECON_FIT_ABBR_MAP[state.heatEconFit] || state.heatEconFit;
    parts.push(`hef${fitAbbr}`);
  }
  
  // Heat econ scope
  if (state.heatEconScope && state.heatEconScope !== 'state') { // state is default
    const scopeAbbr = HEAT_ECON_SCOPE_ABBR_MAP[state.heatEconScope] || state.heatEconScope;
    parts.push(`hes${scopeAbbr}`);
  }
  
  // If no parameters, return empty string
  if (parts.length === 0) {
    return '';
  }
  
  // Join all parts with underscores
  return parts.join('_');
}

export function decodeClimateStateShort(encoded: string): Partial<ClimateUrlState> {
  if (!encoded) return {};
  
  const result: Partial<ClimateUrlState> = {};
  const parts = encoded.split('_');
  
  for (const part of parts) {
    if (part.length < 2) continue;
    
    const key = part.substring(0, part.indexOf(':') !== -1 ? part.indexOf(':') : 
               (part.match(/\d/) ? part.match(/\d/)?.index || 1 : 1));
    const value = part.substring(key.length + (part.indexOf(':') !== -1 ? 1 : 0));
    
    switch (key) {
      case 'c': // city
        result.city = CITY_FULL_MAP[value] || value;
        break;
      case 's': // state
        result.state = value.toLowerCase();
        break;
      case 'b': // basePeriod
        result.basePeriod = BASE_PERIOD_FULL_MAP[value] || value as any;
        break;
      case 'd': // cadence
        result.cadence = CADENCE_FULL_MAP[value] || value as any;
        break;
      case 't': // disasterTypes
        result.disasterTypes = value.split(',').map(type => DISASTER_FULL_MAP[type] || type) as any;
        break;
      case 'p': // perCapita
        result.perCapita = value === '1';
        break;
      case 'dd': // degreeDayMode
        result.degreeDayMode = DEGREE_DAY_FULL_MAP[value] || value as any;
        break;
      case 'cs': // co2Smoothing
        result.co2Smoothing = value === '1';
        break;
      case 'ndd': // normalizeDegreeDays
        result.normalizeDegreeDays = value === '1';
        break;
      case 'wf': // wildfireScope
        result.wildfireScope = WILDFIRE_SCOPE_FULL_MAP[value] || value as any;
        break;
      case 'wn': // warmNightThreshold
        result.warmNightThreshold = parseInt(value);
        break;
      case 'cm': // co2Mode
        result.co2Mode = CO2_MODE_FULL_MAP[value] || value as any;
        break;
      case 'as': // anomalySource
        result.anomalySource = ANOMALY_SOURCE_FULL_MAP[value] || value as any;
        break;
      case 'asm': // anomalySmoothing
        result.anomalySmoothing = value === '1';
        break;
      case 'sc': // selectedCities
        result.selectedCities = value.split(',').map(city => CITY_FULL_MAP[city] || city);
        break;
      case 'sy': // syncY
        result.syncY = value === '1';
        break;
      case 'yr': // yearRange
        const [start, end] = value.split('-').map(Number);
        result.yearRange = [start, end] as [number, number];
        break;
      case 'ht': // hotDayThreshold
        result.hotDayThreshold = parseInt(value);
        break;
      case 'cost': // costMode
        result.costMode = COST_MODE_FULL_MAP[value] || value as any;
        break;
      case 'inf': // inflationAdjust
        result.inflationAdjust = value === '1';
        break;
      case 'hem': // heatEconMetric
        result.heatEconMetric = HEAT_ECON_METRIC_FULL_MAP[value] || value as any;
        break;
      case 'hef': // heatEconFit
        result.heatEconFit = HEAT_ECON_FIT_FULL_MAP[value] || value as any;
        break;
      case 'hes': // heatEconScope
        result.heatEconScope = HEAT_ECON_SCOPE_FULL_MAP[value] || value as any;
        break;
    }
  }
  
  return result;
}