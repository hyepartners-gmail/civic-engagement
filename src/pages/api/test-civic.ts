import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const googleCivicApiKey = process.env.GOOGLE_CIVIC_API_KEY;

  if (!googleCivicApiKey) {
    return res.status(500).json({ message: 'Google Civic API key is missing.' });
  }

  try {
    // Test basic elections API call
    const electionsUrl = `https://www.googleapis.com/civicinfo/v2/elections?key=${googleCivicApiKey}`;
    console.log('Testing elections API...');
    
    const electionsResponse = await fetch(electionsUrl);
    const electionsData = await electionsResponse.json();
    
    if (!electionsResponse.ok) {
      console.error('Elections API error:', electionsData);
      return res.status(500).json({ 
        message: 'Elections API error', 
        error: electionsData,
        status: electionsResponse.status 
      });
    }

    // Test voter info API call
    const address = req.query.address || 'San Francisco, CA 94102';
    const voterInfoUrl = `https://www.googleapis.com/civicinfo/v2/voterinfo?key=${googleCivicApiKey}&address=${encodeURIComponent(address as string)}&returnAllAvailableData=true`;
    console.log('Testing voter info API...');
    
    const voterInfoResponse = await fetch(voterInfoUrl);
    const voterInfoData = await voterInfoResponse.json();
    
    if (!voterInfoResponse.ok) {
      console.error('Voter info API error:', voterInfoData);
    }

    return res.status(200).json({
      message: 'API test successful',
      elections: {
        status: electionsResponse.status,
        count: electionsData.elections?.length || 0,
        data: electionsData.elections?.slice(0, 2) // First 2 elections
      },
      voterInfo: {
        status: voterInfoResponse.status,
        hasElection: !!voterInfoData.election,
        contestCount: voterInfoData.contests?.length || 0,
        pollingLocationCount: voterInfoData.pollingLocations?.length || 0,
        error: voterInfoResponse.ok ? null : voterInfoData
      }
    });

  } catch (error: any) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}