import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { z } from 'zod';

// Simple in-memory cache as fallback
const civicInfoCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

// Zod schema for query validation
const QuerySchema = z.object({
  address: z.string().min(1, 'Address is required'),
  electionId: z.string().optional(),
  officialOnly: z.string().optional().transform(val => val === 'true'),
  clearCache: z.string().optional().transform(val => val === 'true')
});

// Cache helper functions
const getCachedData = (key: string) => {
  const cached = civicInfoCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  civicInfoCache.delete(key);
  return null;
};

const setCachedData = (key: string, data: any) => {
  civicInfoCache.set(key, { data, timestamp: Date.now() });
};

// Normalize address for consistent caching
const normalizeAddress = (address: string): string => {
  return address.trim().toUpperCase().replace(/\s+/g, ' ');
};

// Generate cache key using SHA-256
const generateCacheKey = (address: string, electionId?: string): string => {
  const normalized = normalizeAddress(address);
  const keyString = `${normalized}${electionId || ''}`;
  return createHash('sha256').update(keyString).digest('hex');
};

// Enhanced types according to PRD and full API coverage
interface Contest {
  level: 'Local' | 'County' | 'State' | 'Federal';
  office?: string;
  title?: string;
  type: 'candidate' | 'referendum';
  ballotTitle?: string;
  electorateSpecifications?: string;
  special?: string;
  numberElected?: number;
  numberVotingFor?: number;
  ballotPlacement?: number;
  candidates?: Array<{
    name: string;
    party?: string;
    candidateUrl?: string;
    photoUrl?: string;
    phone?: string;
    email?: string;
    orderOnBallot?: number;
    channels?: Array<{
      type: string;
      id: string;
    }>;
  }>;
  referendumBrief?: string;
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumUrl?: string;
  referendumText?: string;
  referendumProStatement?: string;
  referendumConStatement?: string;
  referendumPassageThreshold?: string;
  referendumEffectOfAbstain?: string;
  referendumBallotResponses?: string[];
}

interface PollingLocation {
  location: string;
  hours: string;
  notes?: string;
  name?: string;
  voterServices?: string;
  startDate?: string;
  endDate?: string;
  latitude?: number;
  longitude?: number;
  sources?: Array<{
    name: string;
    official: boolean;
  }>;
}

interface ElectionInfo {
  id: string;
  name: string;
  date: string;
  ocdDivisionId?: string;
}

interface Official {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  faxNumber?: string;
}

interface ElectionAdministration {
  name?: string;
  electionInfoUrl?: string;
  electionRegistrationUrl?: string;
  electionRegistrationConfirmationUrl?: string;
  electionNoticeText?: string;
  electionNoticeUrl?: string;
  absenteeVotingInfoUrl?: string;
  votingLocationFinderUrl?: string;
  ballotInfoUrl?: string;
  electionRulesUrl?: string;
  voterServices?: string[];
  hoursOfOperation?: string;
  correspondenceAddress?: any;
  physicalAddress?: any;
  electionOfficials?: Official[];
}

// Summary object for quick rendering (as per PRD §5)
interface CivicSummary {
  election: ElectionInfo | null;
  mailOnly?: boolean;
  normalizedInput?: {
    locationName?: string;
    line1?: string;
    line2?: string;
    line3?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  polling: {
    location?: string;
    hours?: string;
    notes?: string;
    name?: string;
    voterServices?: string;
    coordinates?: { lat: number; lng: number };
  };
  earlyVoteSites: PollingLocation[];
  dropOffLocations: PollingLocation[];
  contests: Contest[];
  officials: Official[];
  electionAdministration?: ElectionAdministration;
  localJurisdiction?: ElectionAdministration;
}

interface CivicInfoResponse {
  summary: CivicSummary;
  raw: any; // Full Google response for debugging
}



export default async function handler(req: NextApiRequest, res: NextApiResponse<CivicInfoResponse | { message: string; error?: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Validate query parameters with Zod
  const validation = QuerySchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({ 
      message: 'Invalid query parameters', 
      error: validation.error.errors.map(e => e.message).join(', ')
    });
  }

  const { address, electionId, officialOnly, clearCache } = validation.data;

  const googleCivicApiKey = process.env.GOOGLE_CIVIC_API_KEY;

  if (!googleCivicApiKey) {
    console.error('GOOGLE_CIVIC_API_KEY is not set in environment variables.');
    return res.status(500).json({ message: 'Server configuration error: Google Civic API key is missing.' });
  }

  // Generate cache key using SHA-256 of normalized address + electionId
  const cacheKey = generateCacheKey(address, electionId);
  
  // Clear cache if requested
  if (clearCache) {
    civicInfoCache.delete(cacheKey);
    console.log(`Cache cleared for ${address}`);
  }
  
  const cachedData = getCachedData(cacheKey);

  if (cachedData && !clearCache) {
    console.log(`Serving civic info for ${address} from cache.`);
    return res.status(200).json(cachedData);
  }

  try {
    console.log(`Fetching civic info for address: ${address}`);
    
    // Fetch upcoming elections first
    const electionsUrl = `https://www.googleapis.com/civicinfo/v2/elections?key=${googleCivicApiKey}`;
    let upcomingElections: any[] = [];
    
    try {
      const electionsResponse = await fetch(electionsUrl);
      if (electionsResponse.ok) {
        const electionsData = await electionsResponse.json();
        upcomingElections = electionsData.elections || [];
        console.log(`Found ${upcomingElections.length} upcoming elections`);
      }
    } catch (electionsError) {
      console.error('Error fetching elections:', electionsError);
    }

    // Use specific electionId if provided, otherwise let Google Civic API choose the appropriate election
    let targetElectionId = electionId;
    let selectedElection = null;
    
    if (targetElectionId) {
      selectedElection = upcomingElections.find(e => e.id === targetElectionId);
      console.log(`Using specified election: ${selectedElection?.name} (${selectedElection?.electionDay})`);
    } else {
      // Don't pre-select an election - let the Google Civic API return the appropriate election for the address
      console.log(`No election specified - letting Google Civic API choose appropriate election for address: ${address}`);
    }
    
    // Fetch Voter Info (elections, polling locations, contests, officials)
    let voterInfoUrl = `https://www.googleapis.com/civicinfo/v2/voterinfo?key=${googleCivicApiKey}&address=${encodeURIComponent(address)}&returnAllAvailableData=true`;
    if (targetElectionId) {
      voterInfoUrl += `&electionId=${targetElectionId}`;
    }
    if (officialOnly) {
      voterInfoUrl += `&officialOnly=true`;
    }
    
    console.log(`Calling Google Civic API: ${voterInfoUrl.replace(googleCivicApiKey, '[API_KEY]')}`);
    
    let voterInfoData: any = {};
    try {
      const voterInfoResponse = await fetch(voterInfoUrl);
      
      if (!voterInfoResponse.ok) {
        const errorText = await voterInfoResponse.text();
        console.error('Google Civic API (voterinfo) error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          if (voterInfoResponse.status === 400 && errorData.error?.errors?.[0]?.reason === 'notFound') {
            console.warn(`No voter information found for ${address}.`);
          } else if (voterInfoResponse.status === 403) {
            console.error('Google Civic API quota exceeded');
            return res.status(503).json({ 
              message: 'Service temporarily unavailable due to API quota limits. Please try again in 10 minutes.' 
            });
          } else {
            console.error('Google Civic API (voterinfo) error:', errorData);
          }
        } catch (parseError) {
          console.error('Failed to parse error response as JSON:', parseError);
        }
      } else {
        voterInfoData = await voterInfoResponse.json();
        console.log(`Successfully fetched voter info for ${address}`);
        console.log(`Election returned by Google API:`, voterInfoData.election);
      }
    } catch (voterInfoError) {
      console.error('Error fetching voter info:', voterInfoError);
      // Continue without voter info
    }

    // Helper function to format address
    const formatAddress = (addr: any): string => {
      if (!addr) return '';
      const parts = [
        addr.line1,
        addr.city,
        addr.state,
        addr.zip
      ].filter(Boolean);
      return parts.join(', ');
    };

    // Helper function to determine contest level
    const determineContestLevel = (contest: any): Contest['level'] => {
      if (!contest.office && !contest.referendumTitle) return 'Local';
      
      const text = (contest.office || contest.referendumTitle || '').toLowerCase();
      
      if (text.includes('president') || text.includes('congress') || 
          text.includes('senate') || text.includes('house') ||
          text.includes('federal')) {
        return 'Federal';
      } else if (text.includes('governor') || text.includes('state') || 
                 text.includes('attorney general') || text.includes('secretary of state')) {
        return 'State';
      } else if (text.includes('county') || text.includes('sheriff') ||
                 text.includes('district attorney')) {
        return 'County';
      }
      
      return 'Local';
    };

    // Process contests according to PRD structure with full API data
    const processedContests: Contest[] = (voterInfoData.contests || []).map((contest: any) => {
      const level = determineContestLevel(contest);
      const isReferendum = !contest.candidates || contest.candidates.length === 0;
      
      return {
        level,
        office: contest.office,
        title: contest.office || contest.ballotTitle || contest.referendumTitle,
        type: isReferendum ? 'referendum' : 'candidate',
        ballotTitle: contest.ballotTitle,
        electorateSpecifications: contest.electorateSpecifications,
        special: contest.special,
        numberElected: contest.numberElected,
        numberVotingFor: contest.numberVotingFor,
        ballotPlacement: contest.ballotPlacement,
        candidates: contest.candidates?.map((candidate: any) => ({
          name: candidate.name,
          party: candidate.party,
          candidateUrl: candidate.candidateUrl,
          photoUrl: candidate.photoUrl,
          phone: candidate.phone,
          email: candidate.email,
          orderOnBallot: candidate.orderOnBallot,
          channels: candidate.channels || [],
        })) || [],
        referendumBrief: contest.referendumBrief || contest.referendumTitle,
        referendumTitle: contest.referendumTitle,
        referendumSubtitle: contest.referendumSubtitle,
        referendumUrl: contest.referendumUrl,
        referendumText: contest.referendumText,
        referendumProStatement: contest.referendumProStatement,
        referendumConStatement: contest.referendumConStatement,
        referendumPassageThreshold: contest.referendumPassageThreshold,
        referendumEffectOfAbstain: contest.referendumEffectOfAbstain,
        referendumBallotResponses: contest.referendumBallotResponses || [],
      };
    });

    // Sort contests by level (Federal, State, County, Local)
    processedContests.sort((a, b) => {
      const levelOrder = { 'Federal': 0, 'State': 1, 'County': 2, 'Local': 3 };
      return levelOrder[a.level] - levelOrder[b.level];
    });

    // Process officials data with full API coverage
    const processedOfficials: Official[] = [];
    
    // Extract election officials from state administration body
    if (voterInfoData.state?.[0]?.electionAdministrationBody?.electionOfficials) {
      voterInfoData.state[0].electionAdministrationBody.electionOfficials.forEach((official: any) => {
        processedOfficials.push({
          name: official.name,
          title: official.title,
          phone: official.officePhoneNumber,
          email: official.emailAddress,
          faxNumber: official.faxNumber,
        });
      });
    }
    
    // Extract from local jurisdiction
    if (voterInfoData.state?.[0]?.local_jurisdiction?.electionAdministrationBody?.electionOfficials) {
      voterInfoData.state[0].local_jurisdiction.electionAdministrationBody.electionOfficials.forEach((official: any) => {
        processedOfficials.push({
          name: official.name,
          title: official.title,
          phone: official.officePhoneNumber,
          email: official.emailAddress,
          faxNumber: official.faxNumber,
        });
      });
    }
    
    // Fallback to administration body names if no specific officials
    if (processedOfficials.length === 0) {
      if (voterInfoData.state?.[0]?.electionAdministrationBody) {
        const body = voterInfoData.state[0].electionAdministrationBody;
        processedOfficials.push({
          name: body.name || 'Election Administration',
          phone: body.electionInfoUrl ? undefined : body.phone,
          email: body.email,
          website: body.electionInfoUrl || body.electionRegistrationUrl
        });
      }
      
      if (voterInfoData.state?.[0]?.local_jurisdiction?.electionAdministrationBody) {
        const body = voterInfoData.state[0].local_jurisdiction.electionAdministrationBody;
        processedOfficials.push({
          name: body.name || 'Local Election Office',
          phone: body.phone,
          email: body.email,
          website: body.electionInfoUrl || body.electionRegistrationUrl
        });
      }
    }

    // Helper function to process polling locations with full data
    const processPollingLocation = (location: any): PollingLocation => ({
      location: formatAddress(location.address),
      hours: location.pollingHours || 'Contact local election office',
      notes: location.notes,
      name: location.name,
      voterServices: location.voterServices,
      startDate: location.startDate,
      endDate: location.endDate,
      latitude: location.latitude,
      longitude: location.longitude,
      sources: location.sources || [],
    });

    // Create summary object as per PRD §5 with full API coverage
    const summary: CivicSummary = {
      election: selectedElection || voterInfoData.election ? {
        id: (selectedElection || voterInfoData.election).id,
        name: (selectedElection || voterInfoData.election).name,
        date: (selectedElection || voterInfoData.election).electionDay,
        ocdDivisionId: (selectedElection || voterInfoData.election).ocdDivisionId,
      } : null,
      mailOnly: voterInfoData.mailOnly,
      normalizedInput: voterInfoData.normalizedInput,
      polling: voterInfoData.pollingLocations?.[0] ? {
        location: formatAddress(voterInfoData.pollingLocations[0].address),
        hours: voterInfoData.pollingLocations[0].pollingHours || 'Contact local election office',
        notes: voterInfoData.pollingLocations[0].notes,
        name: voterInfoData.pollingLocations[0].name,
        voterServices: voterInfoData.pollingLocations[0].voterServices,
        coordinates: voterInfoData.pollingLocations[0].latitude && voterInfoData.pollingLocations[0].longitude ? {
          lat: voterInfoData.pollingLocations[0].latitude,
          lng: voterInfoData.pollingLocations[0].longitude
        } : undefined,
      } : {},
      earlyVoteSites: (voterInfoData.earlyVoteSites || []).map(processPollingLocation),
      dropOffLocations: (voterInfoData.dropOffLocations || []).map(processPollingLocation),
      contests: processedContests,
      officials: processedOfficials,
      electionAdministration: voterInfoData.state?.[0]?.electionAdministrationBody,
      localJurisdiction: voterInfoData.state?.[0]?.local_jurisdiction?.electionAdministrationBody,
    };

    // Combine data according to PRD response shape
    const combinedData: CivicInfoResponse = {
      summary,
      raw: {
        voterInfo: voterInfoData,
        elections: upcomingElections
      }
    };

    setCachedData(cacheKey, combinedData);
    console.log(`Successfully processed and cached civic info for ${address}`);
    res.status(200).json(combinedData);

  } catch (error: any) {
    console.error('Error calling Google Civic API:', error);
    
    // Handle specific error cases
    if (error.message?.includes('quota')) {
      return res.status(503).json({ 
        message: 'Service temporarily unavailable due to API quota limits. Please try again in 10 minutes.' 
      });
    }
    
    res.status(500).json({ 
      message: 'Internal server error while fetching civic information.', 
      error: error.message 
    });
  }
}