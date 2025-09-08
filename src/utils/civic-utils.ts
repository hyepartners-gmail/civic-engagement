// US States for dropdown
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// State name to abbreviation mapping
export const STATE_NAME_TO_ABBR: { [key: string]: string } = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Helper function to normalize state value
export const normalizeState = (state: string | undefined): string => {
  if (!state) return '';
  
  // If it's already a 2-letter code, return as is
  if (state.length === 2 && US_STATES.includes(state.toUpperCase())) {
    return state.toUpperCase();
  }
  
  // Try to find the abbreviation for the full state name
  const abbr = STATE_NAME_TO_ABBR[state];
  if (abbr) {
    return abbr;
  }
  
  // Return empty string if no match found (to keep Select controlled)
  return '';
};

// Helper function to format hours - show "ALL DAY" for 12:00-11:59 or similar patterns
export const formatHours = (hours: string): string => {
  if (!hours) return 'Contact local election office';
  
  // Check for all-day patterns
  const allDayPatterns = [
    /12:00.*11:59/i,
    /12:00 AM.*11:59 PM/i,
    /00:00.*23:59/i,
    /24.*hour/i,
    /all.*day/i
  ];
  
  for (const pattern of allDayPatterns) {
    if (pattern.test(hours)) {
      return 'ALL DAY';
    }
  }
  
  return hours;
};

// Helper function to search locations by address, name, or notes
export const searchLocations = (locations: any[], searchTerm: string) => {
  if (!searchTerm.trim()) {
    return locations;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return locations.filter(location => {
    const searchableText = [
      location.location || '',
      location.name || '',
      location.notes || '',
      location.voterServices || ''
    ].join(' ').toLowerCase();
    
    // Support multiple search terms (space-separated)
    const searchTerms = term.split(/\s+/);
    return searchTerms.every(searchTerm => searchableText.includes(searchTerm));
  });
};

// Helper function to get limited locations with search functionality
export const getFilteredLocations = (locations: any[], searchTerm: string, showAll: boolean, defaultLimit = 5) => {
  const filtered = searchLocations(locations, searchTerm);
  
  if (showAll || filtered.length <= defaultLimit) {
    return { 
      locations: filtered, 
      remaining: 0,
      isFiltered: searchTerm.trim().length > 0
    };
  }
  
  return { 
    locations: filtered.slice(0, defaultLimit), 
    remaining: filtered.length - defaultLimit,
    isFiltered: searchTerm.trim().length > 0
  };
};

// Helper function to extract state from user's address
export const getUserStateFromAddress = (address: string): string => {
  if (!address) return '';
  
  // Split address by commas and get the state part (usually second to last)
  const parts = address.split(',').map(part => part.trim());
  if (parts.length >= 2) {
    const statePart = parts[parts.length - 2]; // State is usually before ZIP
    
    // Check if it's a 2-letter state code
    if (statePart.length === 2 && US_STATES.includes(statePart.toUpperCase())) {
      return statePart.toUpperCase();
    }
    
    // Check if it's a full state name
    const stateAbbr = STATE_NAME_TO_ABBR[statePart];
    if (stateAbbr) {
      return stateAbbr;
    }
  }
  
  return '';
};

// Helper function to check if election is relevant to user's state
export const isElectionRelevantToState = (election: any, userState: string): boolean => {
  if (!userState || !election) return false; // Don't show if we can't determine state
  
  // Check election name for state indicators
  const electionName = (election.name || '').toLowerCase();
  const userStateLower = userState.toLowerCase();
  
  // Look for state abbreviation or full name in election name
  const stateFullName = Object.keys(STATE_NAME_TO_ABBR).find(
    name => STATE_NAME_TO_ABBR[name] === userState
  );
  
  if (stateFullName) {
    const stateFullNameLower = stateFullName.toLowerCase();
    if (electionName.includes(userStateLower) || electionName.includes(stateFullNameLower)) {
      return true;
    }
  }
  
  // Check OCD division ID if available - this is the most reliable indicator
  if (election.ocdDivisionId) {
    const ocdId = election.ocdDivisionId.toLowerCase();
    if (ocdId.includes(`state:${userStateLower}`) || ocdId.includes(`/${userStateLower}/`)) {
      return true;
    }
  }
  
  // If it's a federal election, show it for all states
  if (electionName.includes('federal') || 
      electionName.includes('president') || 
      electionName.includes('congress')) {
    return true;
  }
  
  // Be more restrictive with generic names - only show if they explicitly mention the state
  // or if the OCD division ID matches
  if (electionName.includes('general election') || electionName.includes('primary election')) {
    // Only show if it has the state name or OCD division matches
    if (stateFullName && (electionName.includes(userStateLower) || electionName.includes(stateFullName.toLowerCase()))) {
      return true;
    }
    if (election.ocdDivisionId && election.ocdDivisionId.toLowerCase().includes(`state:${userStateLower}`)) {
      return true;
    }
  }
  
  // Don't show elections from other states/localities
  const otherStates = US_STATES.filter(state => state !== userState);
  const otherStateNames = Object.keys(STATE_NAME_TO_ABBR).filter(name => STATE_NAME_TO_ABBR[name] !== userState);
  
  // Check if election name contains other state names
  for (const state of otherStates) {
    if (electionName.includes(state.toLowerCase())) {
      return false;
    }
  }
  
  for (const stateName of otherStateNames) {
    if (electionName.includes(stateName.toLowerCase())) {
      return false;
    }
  }
  
  // If we can't determine and it doesn't contain other state names, err on the side of not showing it
  return false;
};