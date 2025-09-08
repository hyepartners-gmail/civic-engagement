import {
  incrementVoteShard,
  createOrUpdateRollup,
  getShardsForCompositeKey,
  getAggregatedVoteData,
  getRollup,
  aggregateShardCounts,
  getVoteDayBucket,
  createVoteDedupeRecord,
  checkVoteDedupe,
} from './messaging-datastore';
import {
  PendingVote,
  UserContext,
  Counts,
  VoteAggregateShard,
  createCompositeKey,
  choiceToLabel,
  calculateRates,
  ResultsFilters,
  ResultsResponse,
  ResultsItem,
  CountsWithTotal,
  combineCounts,
} from './messaging-schemas';
import { v4 as uuidv4 } from 'uuid';

// ========== VOTE PROCESSING SERVICE ==========

export interface VoteProcessingResult {
  accepted: number;
  dropped: number;
  errors: Array<{ vote: PendingVote; error: string }>;
}

/**
 * Processes a batch of votes with deduplication and aggregation
 */
export async function processVoteBatch(
  votes: PendingVote[],
  userContext: UserContext = {},
  userId?: string,
  anonSessionId?: string
): Promise<VoteProcessingResult> {
  const result: VoteProcessingResult = {
    accepted: 0,
    dropped: 0,
    errors: [],
  };

  const currentDay = getVoteDayBucket();
  const allTimeDay = 'ALL';
  
  // Derive bucket values with fallbacks
  const geoBucket = userContext.geoBucket || '-';
  const partyBucket = userContext.partyBucket || '-';
  const demoBucket = userContext.demoBucket || '-';
  
  // User identifier for deduplication and shard selection
  const userIdentifier = userId || anonSessionId || uuidv4();

  for (const vote of votes) {
    try {
      // Check for vote deduplication (one vote per message per user per 24h)
      const isDuplicate = await checkVoteDedupe(vote.messageId, userId, anonSessionId);
      if (isDuplicate) {
        result.dropped++;
        continue;
      }

      const choiceLabel = choiceToLabel(vote.choice);

      // Process vote for both current day and all-time buckets
      await Promise.all([
        // Current day bucket
        incrementVoteShard(
          vote.messageId,
          geoBucket,
          partyBucket,
          demoBucket,
          currentDay,
          choiceLabel,
          userIdentifier
        ),
        // All-time bucket
        incrementVoteShard(
          vote.messageId,
          geoBucket,
          partyBucket,
          demoBucket,
          allTimeDay,
          choiceLabel,
          userIdentifier
        ),
      ]);

      // Create deduplication record
      await createVoteDedupeRecord(vote.messageId, userId, anonSessionId);

      result.accepted++;
    } catch (error) {
      console.error('Error processing vote:', vote, error);
      result.errors.push({
        vote,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update rollups for affected composite keys (async, don't wait)
  updateRollupsForVotes(votes, geoBucket, partyBucket, demoBucket, currentDay, allTimeDay)
    .catch(error => console.error('Error updating rollups:', error));

  return result;
}

/**
 * Updates rollups for composite keys affected by votes
 */
async function updateRollupsForVotes(
  votes: PendingVote[],
  geoBucket: string,
  partyBucket: string,
  demoBucket: string,
  currentDay: string,
  allTimeDay: string
): Promise<void> {
  const uniqueMessageIds = Array.from(new Set(votes.map(v => v.messageId)));
  
  const rollupPromises: Promise<void>[] = [];
  
  for (const messageId of uniqueMessageIds) {
    // Update rollup for current day
    const currentDayKey = createCompositeKey(messageId, geoBucket, partyBucket, demoBucket, currentDay);
    rollupPromises.push(createOrUpdateRollup(currentDayKey));
    
    // Update rollup for all-time
    const allTimeKey = createCompositeKey(messageId, geoBucket, partyBucket, demoBucket, allTimeDay);
    rollupPromises.push(createOrUpdateRollup(allTimeKey));
  }
  
  await Promise.all(rollupPromises);
}

// ========== RESULTS AGGREGATION SERVICE ==========

/**
 * Aggregates vote results based on filters and grouping
 */
export async function aggregateVoteResults(filters: ResultsFilters): Promise<ResultsResponse> {
  const { messageId, geo, party, demo, from, to, rollup, groupBy, limit } = filters;
  
  // Determine if we should try rollups first
  const preferRollups = rollup === 'true';
  
  let aggregatedData: VoteAggregateShard[] = [];
  
  if (preferRollups) {
    // Try to get data from rollups first
    aggregatedData = await getDataFromRollups(filters);
  }
  
  if (aggregatedData.length === 0) {
    // Fall back to aggregating shards
    aggregatedData = await getDataFromShards(filters);
  }
  
  // Group and aggregate the data
  const groupedResults = groupAndAggregateData(aggregatedData, groupBy, limit);
  
  // Calculate totals
  const totals = calculateTotals(groupedResults);
  
  return {
    groupBy,
    items: groupedResults,
    totals,
  };
}

/**
 * Attempts to get data from rollups
 */
async function getDataFromRollups(filters: ResultsFilters): Promise<VoteAggregateShard[]> {
  // For now, implement basic rollup reading
  // In a full implementation, this would query VoteAggregateRollup entities
  // and convert them to the expected format
  return [];
}

/**
 * Gets data by aggregating shards
 */
async function getDataFromShards(filters: ResultsFilters): Promise<VoteAggregateShard[]> {
  const { messageId, geo, party, demo, from, to } = filters;
  
  // Convert 'ALL' values to undefined for the query
  const queryFilters = {
    messageId,
    geoBucket: geo === 'ALL' ? undefined : geo,
    partyBucket: party === 'ALL' ? undefined : party,
    demoBucket: demo === 'ALL' ? undefined : demo,
    fromDate: from,
    toDate: to,
  };
  
  return getAggregatedVoteData(queryFilters);
}

/**
 * Groups and aggregates data based on groupBy parameter
 */
function groupAndAggregateData(
  data: VoteAggregateShard[],
  groupBy: string,
  limit: number
): ResultsItem[] {
  const groups = new Map<string, VoteAggregateShard[]>();
  
  // Group data by the specified dimension
  for (const shard of data) {
    let groupKey: string;
    
    switch (groupBy) {
      case 'message':
        groupKey = shard.messageId;
        break;
      case 'day':
        groupKey = shard.day;
        break;
      case 'geo':
        groupKey = shard.geoBucket || '-';
        break;
      case 'party':
        groupKey = shard.partyBucket || '-';
        break;
      case 'demo':
        groupKey = shard.demoBucket || '-';
        break;
      default:
        groupKey = shard.messageId;
    }
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(shard);
  }
  
  // Aggregate each group and create result items
  const results: ResultsItem[] = [];
  
  for (const [key, shards] of Array.from(groups.entries())) {
    const aggregatedCounts = aggregateShardCounts(shards);
    const total = aggregatedCounts.love + aggregatedCounts.like + 
                  aggregatedCounts.dislike + aggregatedCounts.hate;
    
    const countsWithTotal: CountsWithTotal = {
      ...aggregatedCounts,
      n: total,
    };
    
    const rates = calculateRates(aggregatedCounts);
    
    results.push({
      key,
      counts: countsWithTotal,
      rates,
    });
  }
  
  // Sort by key and apply limit
  return results
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(0, limit);
}

/**
 * Calculates totals across all result items
 */
function calculateTotals(items: ResultsItem[]): CountsWithTotal {
  const totalCounts = items.reduce(
    (acc, item) => combineCounts(acc, item.counts),
    { love: 0, like: 0, dislike: 0, hate: 0 }
  );
  
  const total = totalCounts.love + totalCounts.like + 
                totalCounts.dislike + totalCounts.hate;
  
  return {
    ...totalCounts,
    n: total,
  };
}

// ========== ANALYTICS HELPERS ==========

/**
 * Gets vote statistics for a specific message
 */
export async function getMessageVoteStats(messageId: string): Promise<{
  allTime: CountsWithTotal & { rates: ReturnType<typeof calculateRates> };
  recent: CountsWithTotal & { rates: ReturnType<typeof calculateRates> };
}> {
  // Get all-time stats
  const allTimeKey = createCompositeKey(messageId, '-', '-', '-', 'ALL');
  const allTimeShards = await getShardsForCompositeKey(allTimeKey);
  const allTimeCounts = aggregateShardCounts(allTimeShards);
  const allTimeTotal = allTimeCounts.love + allTimeCounts.like + 
                       allTimeCounts.dislike + allTimeCounts.hate;
  
  // Get recent stats (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentData = await getAggregatedVoteData({
    messageId,
    fromDate: getVoteDayBucket(sevenDaysAgo),
    toDate: getVoteDayBucket(),
  });
  const recentCounts = aggregateShardCounts(recentData);
  const recentTotal = recentCounts.love + recentCounts.like + 
                      recentCounts.dislike + recentCounts.hate;
  
  return {
    allTime: {
      ...allTimeCounts,
      n: allTimeTotal,
      rates: calculateRates(allTimeCounts),
    },
    recent: {
      ...recentCounts,
      n: recentTotal,
      rates: calculateRates(recentCounts),
    },
  };
}

/**
 * Compares vote statistics between two messages (for A/B testing)
 */
export async function compareMessageStats(messageIdA: string, messageIdB: string) {
  const [statsA, statsB] = await Promise.all([
    getMessageVoteStats(messageIdA),
    getMessageVoteStats(messageIdB),
  ]);
  
  return {
    messageA: statsA,
    messageB: statsB,
    comparison: {
      favorabilityDiff: statsA.allTime.rates.favorability - statsB.allTime.rates.favorability,
      engagementDiff: statsA.allTime.n - statsB.allTime.n,
      winner: statsA.allTime.rates.favorability > statsB.allTime.rates.favorability ? 'A' : 'B',
    },
  };
}