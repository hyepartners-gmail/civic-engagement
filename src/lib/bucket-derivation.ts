import { PartyBucket } from './messaging-schemas';

// ========== GEOGRAPHIC BUCKET DERIVATION ==========

/**
 * Derives geographic bucket from user location data
 * Format: us/state/county or us/state for state-level or us for country-level
 */
export function deriveGeoBucket(userProfile: {
  zipCode?: string;
  city?: string;
  state?: string;
  countyFips?: string;
  congressionalDistrict?: string;
}): string {
  const { state, countyFips, zipCode } = userProfile;
  
  // Most granular: county level
  if (state && countyFips) {
    return `us/${state.toLowerCase()}/${countyFips}`;
  }
  
  // State level
  if (state) {
    return `us/${state.toLowerCase()}`;
  }
  
  // Fallback: country level
  return 'us';
}

/**
 * Extracts state code from various geographic inputs
 */
export function extractStateCode(userProfile: {
  state?: string;
  zipCode?: string;
}): string | undefined {
  const { state, zipCode } = userProfile;
  
  // Direct state code
  if (state && state.length === 2) {
    return state.toUpperCase();
  }
  
  // Full state name mapping (partial list)
  const stateNameMap: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY'
  };
  
  if (state && stateNameMap[state.toLowerCase()]) {
    return stateNameMap[state.toLowerCase()];
  }
  
  // TODO: Derive from zip code using a zip-to-state lookup
  // This would require a zip code database
  
  return undefined;
}

// ========== PARTY BUCKET DERIVATION ==========

/**
 * Derives party bucket from user political preferences
 */
export function derivePartyBucket(userProfile: {
  partyPreference?: string;
  politicalAlignment?: string;
}): PartyBucket {
  const { partyPreference, politicalAlignment } = userProfile;
  
  // Direct party preference mapping
  if (partyPreference) {
    const party = partyPreference.toLowerCase();
    
    if (party.includes('democrat') || party.includes('dem') || party === 'd') {
      return 'D';
    }
    if (party.includes('republican') || party.includes('rep') || party === 'r') {
      return 'R';
    }
    if (party.includes('independent') || party.includes('ind') || party === 'i') {
      return 'I';
    }
    if (party.includes('other') || party === 'o') {
      return 'O';
    }
  }
  
  // Political alignment as fallback
  if (politicalAlignment) {
    const alignment = politicalAlignment.toLowerCase();
    
    if (alignment.includes('liberal') || alignment.includes('progressive') || alignment.includes('left')) {
      return 'D';
    }
    if (alignment.includes('conservative') || alignment.includes('right')) {
      return 'R';
    }
    if (alignment.includes('moderate') || alignment.includes('centrist') || alignment.includes('independent')) {
      return 'I';
    }
  }
  
  // Default: Unknown
  return 'U';
}

/**
 * Normalizes party input to standard bucket
 */
export function normalizePartyInput(input: string): PartyBucket {
  const normalized = input.toLowerCase().trim();
  
  const partyMap: Record<string, PartyBucket> = {
    'democrat': 'D', 'democratic': 'D', 'dem': 'D', 'd': 'D',
    'republican': 'R', 'rep': 'R', 'gop': 'R', 'r': 'R',
    'independent': 'I', 'ind': 'I', 'i': 'I',
    'other': 'O', 'o': 'O',
    'unknown': 'U', 'u': 'U',
  };
  
  return partyMap[normalized] || 'U';
}

// ========== DEMOGRAPHIC BUCKET DERIVATION ==========

/**
 * Age bucket definitions
 */
export const AGE_BUCKETS = {
  '18_24': { min: 18, max: 24 },
  '25_34': { min: 25, max: 34 },
  '35_44': { min: 35, max: 44 },
  '45_54': { min: 45, max: 54 },
  '55_64': { min: 55, max: 64 },
  '65_plus': { min: 65, max: 150 },
} as const;

export type AgeBucket = keyof typeof AGE_BUCKETS;

/**
 * Gender bucket definitions
 */
export const GENDER_BUCKETS = {
  'M': 'Male',
  'F': 'Female', 
  'NB': 'Non-binary',
  'U': 'Unknown/Prefer not to say',
} as const;

export type GenderBucket = keyof typeof GENDER_BUCKETS;

/**
 * Derives age bucket from birth date or age
 */
export function deriveAgeBucket(userProfile: {
  birthDate?: string | Date;
  age?: number;
}): AgeBucket | 'unknown' {
  const { birthDate, age } = userProfile;
  
  let userAge: number | undefined;
  
  if (age && age > 0) {
    userAge = age;
  } else if (birthDate) {
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    const today = new Date();
    userAge = today.getFullYear() - birth.getFullYear();
    
    // Adjust if birthday hasn't occurred this year
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      userAge--;
    }
  }
  
  if (!userAge || userAge < 18) {
    return 'unknown';
  }
  
  // Find matching age bucket
  for (const [bucket, range] of Object.entries(AGE_BUCKETS)) {
    if (userAge >= range.min && userAge <= range.max) {
      return bucket as AgeBucket;
    }
  }
  
  return 'unknown';
}

/**
 * Derives gender bucket from user profile
 */
export function deriveGenderBucket(userProfile: {
  gender?: string;
}): GenderBucket {
  const { gender } = userProfile;
  
  if (!gender) return 'U';
  
  const normalized = gender.toLowerCase().trim();
  
  if (normalized.includes('male') && !normalized.includes('female')) {
    return 'M';
  }
  if (normalized.includes('female')) {
    return 'F';
  }
  if (normalized.includes('non-binary') || normalized.includes('nonbinary') || 
      normalized.includes('non binary') || normalized.includes('enby')) {
    return 'NB';
  }
  
  return 'U';
}

/**
 * Combines gender and age into demographic bucket
 * Format: {gender}_{age} (e.g., \"F_25_34\", \"M_45_54\")
 */
export function deriveDemoBucket(userProfile: {
  birthDate?: string | Date;
  age?: number;
  gender?: string;
}): string {
  const ageBucket = deriveAgeBucket(userProfile);
  const genderBucket = deriveGenderBucket(userProfile);
  
  if (ageBucket === 'unknown') {
    return genderBucket === 'U' ? '-' : genderBucket;
  }
  
  return `${genderBucket}_${ageBucket}`;
}

// ========== COMPREHENSIVE BUCKET DERIVATION ==========

/**
 * Derives all buckets from a user profile
 */
export function deriveAllBuckets(userProfile: {
  // Geographic
  zipCode?: string;
  city?: string;
  state?: string;
  countyFips?: string;
  congressionalDistrict?: string;
  
  // Political
  partyPreference?: string;
  politicalAlignment?: string;
  
  // Demographic
  birthDate?: string | Date;
  age?: number;
  gender?: string;
}) {
  return {
    geoBucket: deriveGeoBucket(userProfile),
    partyBucket: derivePartyBucket(userProfile),
    demoBucket: deriveDemoBucket(userProfile),
  };
}

/**
 * Validates bucket values to ensure they meet format requirements
 */
export function validateBuckets(buckets: {
  geoBucket?: string;
  partyBucket?: string;
  demoBucket?: string;
}) {
  const validated = { ...buckets };
  
  // Ensure all strings are lowercase
  if (validated.geoBucket) {
    validated.geoBucket = validated.geoBucket.toLowerCase();
  }
  
  if (validated.partyBucket) {
    validated.partyBucket = validated.partyBucket.toUpperCase();
  }
  
  if (validated.demoBucket) {
    validated.demoBucket = validated.demoBucket.toUpperCase();
  }
  
  return validated;
}

// ========== BUCKET ANALYSIS UTILITIES ==========

/**
 * Analyzes geographic distribution
 */
export function analyzeGeoDistribution(geoBuckets: string[]) {
  const distribution = new Map<string, number>();
  const stateDistribution = new Map<string, number>();
  
  for (const bucket of geoBuckets) {
    // Count exact bucket
    distribution.set(bucket, (distribution.get(bucket) || 0) + 1);
    
    // Extract state for state-level analysis
    const parts = bucket.split('/');
    if (parts.length >= 2 && parts[0] === 'us') {
      const state = parts[1];
      stateDistribution.set(state, (stateDistribution.get(state) || 0) + 1);
    }
  }
  
  return {
    byBucket: Object.fromEntries(distribution),
    byState: Object.fromEntries(stateDistribution),
    totalBuckets: distribution.size,
    totalStates: stateDistribution.size,
  };
}

/**
 * Analyzes demographic distribution
 */
export function analyzeDemoDistribution(demoBuckets: string[]) {
  const genderCounts = new Map<string, number>();
  const ageCounts = new Map<string, number>();
  const fullCounts = new Map<string, number>();
  
  for (const bucket of demoBuckets) {
    fullCounts.set(bucket, (fullCounts.get(bucket) || 0) + 1);
    
    const parts = bucket.split('_');
    if (parts.length >= 1) {
      const gender = parts[0];
      genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);
    }
    
    if (parts.length >= 2) {
      const age = parts.slice(1).join('_');
      ageCounts.set(age, (ageCounts.get(age) || 0) + 1);
    }
  }
  
  return {
    byDemoBucket: Object.fromEntries(fullCounts),
    byGender: Object.fromEntries(genderCounts),
    byAge: Object.fromEntries(ageCounts),
  };
}