import { datastore, fromDatastore, DATASTORE_NAMESPACE } from './datastoreServer';
import {
  Message,
  VoteAggregateShard,
  VoteAggregateRollup,
  ABPair,
  IdempotencyRecord,
  VoteDedupeRecord,
  Counts,
  MessageStatus,
  ABPairStatus,
  createCompositeKey,
  getShardId,
  combineCounts,
} from './messaging-schemas';
import { generateInitialRank, generateRankBetween } from './lexorank';
import { v4 as uuidv4 } from 'uuid';

// ========== CONSTANTS ==========

export const SHARD_COUNT = parseInt(process.env.SHARD_COUNT || '16', 10);
export const ONE_VOTE_TTL_HOURS = parseInt(process.env.ONE_VOTE_TTL_HOURS || '24', 10);
export const IDEMPOTENCY_TTL_HOURS = parseInt(process.env.IDEMPOTENCY_TTL_HOURS || '24', 10);

// ========== MESSAGE OPERATIONS ==========

/**
 * Creates a new message in Datastore
 */
export async function createMessage(
  slogan: string,
  subline?: string,
  status: MessageStatus = 'active'
): Promise<Message> {
  const messageId = uuidv4();
  const now = new Date();
  
  // Generate initial rank (will be improved with LexoRank)
  const rank = await generateInitialMessageRank();
  
  const messageData: Omit<Message, 'id'> = {
    slogan,
    subline,
    status,
    rank,
    createdAt: now,
    updatedAt: now,
  };

  const key = datastore.key(['Message', messageId]);
  await datastore.save({ key, data: messageData });

  return { ...messageData, id: messageId };
}

/**
 * Gets messages by status, ordered by rank
 */
export async function getMessages(status?: MessageStatus | 'all'): Promise<Message[]> {
  // Create base query with ordering
  let query = datastore.createQuery('Message').order('rank');
  
  // Only add status filter if status is specified and not 'all'
  // This avoids the composite index requirement when fetching all messages
  if (status && status !== 'all') {
    query = query.filter('status', '=', status);
  }

  try {
    const [entities] = await datastore.runQuery(query);
    const messages = entities.map(entity => fromDatastore<Message>(entity));
    
    // If status is 'all', we've already returned all messages
    // If status is specified, filter was applied in the query
    return messages;
  } catch (error) {
    console.error('Error in getMessages:', error);
    // If there's a composite index issue, fall back to getting all messages without filter
    // Type check the error object before accessing properties
    if (typeof error === 'object' && error !== null && 'code' in error && 
        (error as any).code === 9 && status && status !== 'all') {
      console.warn(`Composite index not available for status filter. Falling back to client-side filtering for status: ${status}`);
      
      // Get all messages without filter
      const fallbackQuery = datastore.createQuery('Message').order('rank');
      const [entities] = await datastore.runQuery(fallbackQuery);
      const allMessages = entities.map(entity => fromDatastore<Message>(entity));
      
      // Filter on the client side
      return allMessages.filter(msg => msg.status === status);
    }
    
    throw error;
  }
}

/**
 * Gets a single message by ID
 */
export async function getMessage(id: string): Promise<Message | null> {
  const key = datastore.key(['Message', id]);
  const [entity] = await datastore.get(key);
  
  if (!entity) return null;
  return fromDatastore<Message>(entity);
}

/**
 * Updates a message
 */
export async function updateMessage(
  id: string, 
  updates: Partial<Pick<Message, 'slogan' | 'subline' | 'status'>>
): Promise<Message | null> {
  const key = datastore.key(['Message', id]);
  const [entity] = await datastore.get(key);
  
  if (!entity) return null;

  const updatedData = {
    ...entity,
    ...updates,
    updatedAt: new Date(),
  };

  await datastore.save({ key, data: updatedData });
  return fromDatastore<Message>({ ...updatedData, [datastore.KEY]: key });
}

/**
 * Deletes a message
 */
export async function deleteMessage(id: string): Promise<boolean> {
  const key = datastore.key(['Message', id]);
  await datastore.delete(key);
  return true;
}

/**
 * Updates message rank (for reordering)
 */
export async function updateMessageRank(id: string, rank: string): Promise<Message | null> {
  const key = datastore.key(['Message', id]);
  const [entity] = await datastore.get(key);
  
  if (!entity) return null;

  const updatedData = {
    ...entity,
    rank,
    updatedAt: new Date(),
  };

  await datastore.save({ key, data: updatedData });
  return fromDatastore<Message>({ ...updatedData, [datastore.KEY]: key });
}

/**
 * Generates initial rank for new messages using LexoRank
 */
async function generateInitialMessageRank(): Promise<string> {
  // Get existing ranks to determine proper placement
  const query = datastore.createQuery('Message').order('rank');
  const [entities] = await datastore.runQuery(query);
  
  if (entities.length === 0) {
    return generateInitialRank();
  }
  
  const existingRanks = entities.map(entity => entity.rank);
  const lastRank = existingRanks[existingRanks.length - 1];
  
  // Generate rank after the last one
  return generateRankBetween(lastRank);
}

// ========== VOTE AGGREGATE SHARD OPERATIONS ==========

/**
 * Increments vote counts in a shard
 */
export async function incrementVoteShard(
  messageId: string,
  geoBucket: string = '-',
  partyBucket: string = '-',
  demoBucket: string = '-',
  day: string,
  choice: keyof Counts,
  userIdentifier: string
): Promise<void> {
  const compositeKey = createCompositeKey(messageId, geoBucket, partyBucket, demoBucket, day);
  const shardId = getShardId(messageId, userIdentifier, SHARD_COUNT);
  const shardKey = `${compositeKey}:${shardId}`;
  
  const key = datastore.key(['VoteAggregateShard', shardKey]);
  
  const transaction = datastore.transaction();
  try {
    await transaction.run();
    const [entity] = await transaction.get(key);
    
    const now = new Date();
    let shardData: Omit<VoteAggregateShard, 'id'>;
    
    if (entity) {
      // Update existing shard
      const existing = fromDatastore<VoteAggregateShard>(entity);
      shardData = {
        ...existing,
        counts: {
          ...existing.counts,
          [choice]: existing.counts[choice] + 1,
        },
        updatedAt: now,
      };
    } else {
      // Create new shard
      const emptyCounts: Counts = { love: 0, like: 0, dislike: 0, hate: 0 };
      shardData = {
        messageId,
        geoBucket: geoBucket === '-' ? undefined : geoBucket,
        partyBucket: partyBucket === '-' ? undefined : partyBucket as any,
        demoBucket: demoBucket === '-' ? undefined : demoBucket,
        day,
        counts: { ...emptyCounts, [choice]: 1 },
        updatedAt: now,
        compositeKey,
        shardId,
      };
    }
    
    transaction.save({ key, data: shardData });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Reads all shards for a composite key and sums them
 */
export async function getShardsForCompositeKey(compositeKey: string): Promise<VoteAggregateShard[]> {
  const query = datastore.createQuery('VoteAggregateShard')
    .filter('compositeKey', '=', compositeKey);
  
  const [entities] = await datastore.runQuery(query);
  return entities.map(entity => fromDatastore<VoteAggregateShard>(entity));
}

/**
 * Reads shards with filters and returns aggregated results
 */
export async function getAggregatedVoteData(filters: {
  messageId?: string;
  geoBucket?: string;
  partyBucket?: string;
  demoBucket?: string;
  day?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<VoteAggregateShard[]> {
  let query = datastore.createQuery('VoteAggregateShard');
  
  if (filters.messageId) {
    query = query.filter('messageId', '=', filters.messageId);
  }
  
  if (filters.day) {
    query = query.filter('day', '=', filters.day);
  }
  
  // Note: Additional composite indexes may be needed for complex filtering
  const [entities] = await datastore.runQuery(query);
  let results = entities.map(entity => fromDatastore<VoteAggregateShard>(entity));
  
  // Apply additional filters in memory (not ideal for large datasets)
  if (filters.geoBucket) {
    results = results.filter(shard => shard.geoBucket === filters.geoBucket);
  }
  
  if (filters.partyBucket) {
    results = results.filter(shard => shard.partyBucket === filters.partyBucket);
  }
  
  if (filters.demoBucket) {
    results = results.filter(shard => shard.demoBucket === filters.demoBucket);
  }
  
  return results;
}

// ========== VOTE AGGREGATE ROLLUP OPERATIONS ==========

/**
 * Creates or updates a rollup for a composite key
 */
export async function createOrUpdateRollup(compositeKey: string): Promise<void> {
  const shards = await getShardsForCompositeKey(compositeKey);
  
  if (shards.length === 0) return;
  
  // Sum all shard counts
  const totalCounts = shards.reduce((acc, shard) => combineCounts(acc, shard.counts), 
    { love: 0, like: 0, dislike: 0, hate: 0 });
  
  // Use the first shard as template for dimensions
  const template = shards[0];
  
  const rollupData: Omit<VoteAggregateRollup, 'id'> = {
    messageId: template.messageId,
    geoBucket: template.geoBucket,
    partyBucket: template.partyBucket,
    demoBucket: template.demoBucket,
    day: template.day,
    counts: totalCounts,
    updatedAt: new Date(),
  };
  
  const key = datastore.key(['VoteAggregateRollup', compositeKey]);
  await datastore.save({ key, data: rollupData });
}

/**
 * Gets a rollup by composite key
 */
export async function getRollup(compositeKey: string): Promise<VoteAggregateRollup | null> {
  const key = datastore.key(['VoteAggregateRollup', compositeKey]);
  const [entity] = await datastore.get(key);
  
  if (!entity) return null;
  return fromDatastore<VoteAggregateRollup>(entity);
}

// ========== A/B TESTING OPERATIONS ==========

/**
 * Creates a new A/B testing pair
 */
export async function createABPair(
  messageIdA: string,
  messageIdB: string,
  status: ABPairStatus = 'active'
): Promise<ABPair> {
  const pairId = uuidv4();
  const now = new Date();
  
  // Generate initial rank for the pair
  const rank = await generateInitialABPairRank();
  
  const pairData: Omit<ABPair, 'id'> = {
    a: messageIdA,
    b: messageIdB,
    status,
    rank,
    createdAt: now,
    updatedAt: now,
  };
  
  const key = datastore.key(['ABPair', pairId]);
  await datastore.save({ key, data: pairData });
  
  return { ...pairData, id: pairId };
}

/**
 * Gets all A/B testing pairs ordered by rank
 */
export async function getABPairs(status?: ABPairStatus): Promise<ABPair[]> {
  let query = datastore.createQuery('ABPair').order('rank');
  
  if (status) {
    query = query.filter('status', '=', status);
  }
  
  const [entities] = await datastore.runQuery(query);
  return entities.map(entity => fromDatastore<ABPair>(entity));
}

/**
 * Updates an A/B testing pair
 */
export async function updateABPair(
  id: string,
  updates: Partial<Pick<ABPair, 'a' | 'b' | 'status' | 'rank'>>
): Promise<ABPair | null> {
  const key = datastore.key(['ABPair', id]);
  const [entity] = await datastore.get(key);
  
  if (!entity) return null;
  
  const updatedData = {
    ...entity,
    ...updates,
    updatedAt: new Date(),
  };
  
  await datastore.save({ key, data: updatedData });
  return fromDatastore<ABPair>({ ...updatedData, [datastore.KEY]: key });
}

/**
 * Deletes an A/B testing pair
 */
export async function deleteABPair(id: string): Promise<boolean> {
  const key = datastore.key(['ABPair', id]);
  await datastore.delete(key);
  return true;
}

/**
 * Generates initial rank for new A/B pairs using LexoRank
 */
async function generateInitialABPairRank(): Promise<string> {
  // Get existing ranks to determine proper placement
  const query = datastore.createQuery('ABPair').order('rank');
  const [entities] = await datastore.runQuery(query);
  
  if (entities.length === 0) {
    return generateInitialRank();
  }
  
  const existingRanks = entities.map(entity => entity.rank);
  const lastRank = existingRanks[existingRanks.length - 1];
  
  // Generate rank after the last one
  return generateRankBetween(lastRank);
}

// ========== IDEMPOTENCY AND DEDUPLICATION ==========

/**
 * Checks if an idempotency key has been used
 */
export async function checkIdempotency(idempotencyKey: string): Promise<boolean> {
  const key = datastore.key(['IdempotencyRecord', idempotencyKey]);
  const [entity] = await datastore.get(key);
  
  if (!entity) return false;
  
  const record = fromDatastore<IdempotencyRecord>(entity);
  return record.ttl > new Date(); // Check if not expired
}

/**
 * Creates an idempotency record
 */
export async function createIdempotencyRecord(idempotencyKey: string): Promise<void> {
  const now = new Date();
  const ttl = new Date(now.getTime() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000);
  
  const recordData: Omit<IdempotencyRecord, 'id'> = {
    processedAt: now,
    ttl,
  };
  
  const key = datastore.key(['IdempotencyRecord', idempotencyKey]);
  await datastore.save({ key, data: recordData });
}

/**
 * Checks if a user has already voted on a message within TTL
 */
export async function checkVoteDedupe(
  messageId: string,
  userId?: string,
  anonSessionId?: string
): Promise<boolean> {
  const identifier = userId || anonSessionId;
  if (!identifier) return false;
  
  const dedupeKey = `${identifier}:${messageId}`;
  const key = datastore.key(['VoteDedupeRecord', dedupeKey]);
  const [entity] = await datastore.get(key);
  
  if (!entity) return false;
  
  const record = fromDatastore<VoteDedupeRecord>(entity);
  return record.ttl > new Date(); // Check if not expired
}

/**
 * Creates a vote deduplication record
 */
export async function createVoteDedupeRecord(
  messageId: string,
  userId?: string,
  anonSessionId?: string
): Promise<void> {
  const identifier = userId || anonSessionId;
  if (!identifier) return;
  
  const now = new Date();
  const ttl = new Date(now.getTime() + ONE_VOTE_TTL_HOURS * 60 * 60 * 1000);
  
  const dedupeKey = `${identifier}:${messageId}`;
  const recordData: Omit<VoteDedupeRecord, 'id'> = {
    messageId,
    userId,
    anonSessionId,
    votedAt: now,
    ttl,
  };
  
  const key = datastore.key(['VoteDedupeRecord', dedupeKey]);
  await datastore.save({ key, data: recordData });
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Aggregates vote counts from multiple shards
 */
export function aggregateShardCounts(shards: VoteAggregateShard[]): Counts {
  return shards.reduce((acc, shard) => combineCounts(acc, shard.counts), 
    { love: 0, like: 0, dislike: 0, hate: 0 });
}

/**
 * Gets UTC date string (YYYY-MM-DD) for vote day buckets
 */
export function getVoteDayBucket(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Creates indexes needed for efficient querying (to be run during setup)
 */
export async function createDatastoreIndexes(): Promise<void> {
  // Note: In a real deployment, these would be defined in index.yaml
  // This is here for documentation purposes
  console.log('Indexes needed:');
  console.log('- VoteAggregateShard: messageId');
  console.log('- VoteAggregateShard: day');
  console.log('- VoteAggregateShard: messageId + day');
  console.log('- VoteAggregateShard: messageId + geoBucket + day');
  console.log('- VoteAggregateShard: messageId + partyBucket + day');
  console.log('- VoteAggregateShard: messageId + demoBucket + day');
  console.log('- VoteAggregateShard: compositeKey');
  console.log('- Message: rank');
  console.log('- Message: status + rank');
  console.log('- ABPair: rank');
  console.log('- ABPair: status + rank');
}