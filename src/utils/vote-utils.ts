// Utility functions for processing vote data

export interface TractVoteData {
  [tractId: string]: {
    [candidate: string]: number;
  };
}

export interface DistrictVoteData {
  margin: number;
  winner: 'D' | 'R' | 'Other';
  totalVotes: number;
  democraticVotes: number;
  republicanVotes: number;
  otherVotes: number;
}

// Process tract-level vote data to get summary statistics
export function processTractVoteData(voteData: any): {
  totalVotes: number;
  democraticVotes: number;
  republicanVotes: number;
  otherVotes: number;
  winner: 'D' | 'R' | 'Other';
  margin: number;
} {
  if (!voteData || !voteData.data) {
    return {
      totalVotes: 0,
      democraticVotes: 0,
      republicanVotes: 0,
      otherVotes: 0,
      winner: 'Other',
      margin: 0
    };
  }

  let totalDemocratic = 0;
  let totalRepublican = 0;
  let totalOther = 0;

  // Process each tract's vote data
  Object.values(voteData.data).forEach((tractVotes: any) => {
    Object.entries(tractVotes).forEach(([candidate, votes]: [string, any]) => {
      const voteCount = typeof votes === 'number' ? votes : 0;
      
      // Categorize candidates by party
      if (candidate.includes('Hillary Clinton') || candidate.includes('Joseph R. Biden')) {
        totalDemocratic += voteCount;
      } else if (candidate.includes('Donald J. Trump')) {
        totalRepublican += voteCount;
      } else if (!candidate.includes('Under Votes') && !candidate.includes('Over Votes')) {
        totalOther += voteCount;
      }
    });
  });

  const totalVotes = totalDemocratic + totalRepublican + totalOther;
  const winner = totalDemocratic > totalRepublican ? 'D' : totalRepublican > totalDemocratic ? 'R' : 'Other';
  const margin = totalVotes > 0 ? Math.abs(totalDemocratic - totalRepublican) / totalVotes : 0;

  return {
    totalVotes,
    democraticVotes: totalDemocratic,
    republicanVotes: totalRepublican,
    otherVotes: totalOther,
    winner,
    margin
  };
}

// Get vote statistics for display
export function getVoteStatsDisplay(voteData: any, year: string): string {
  const stats = processTractVoteData(voteData);
  
  if (stats.totalVotes === 0) {
    return `No vote data available for ${year}`;
  }

  const demPercent = ((stats.democraticVotes / stats.totalVotes) * 100).toFixed(1);
  const repPercent = ((stats.republicanVotes / stats.totalVotes) * 100).toFixed(1);
  
  return `${year}: ${stats.winner === 'D' ? 'Democratic' : stats.winner === 'R' ? 'Republican' : 'Other'} (D: ${demPercent}%, R: ${repPercent}%)`;
}