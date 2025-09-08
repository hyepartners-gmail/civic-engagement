import { z } from 'zod';

// ========== ENUMS AND CONSTANTS ==========

export const VoteChoiceEnum = z.enum(['1', '2', '3', '4'] as const);
export type VoteChoice = z.infer<typeof VoteChoiceEnum>;

export const VoteChoiceNumberEnum = z.literal(1).or(z.literal(2)).or(z.literal(3)).or(z.literal(4));
export type VoteChoiceNumber = z.infer<typeof VoteChoiceNumberEnum>;

export const MessageStatusEnum = z.enum(['active', 'inactive'] as const);
export type MessageStatus = z.infer<typeof MessageStatusEnum>;

export const PartyBucketEnum = z.enum(['D', 'R', 'I', 'O', 'U'] as const);
export type PartyBucket = z.infer<typeof PartyBucketEnum>;

export const ABPairStatusEnum = z.enum(['active', 'inactive'] as const);
export type ABPairStatus = z.infer<typeof ABPairStatusEnum>;

export const GroupByEnum = z.enum(['message', 'day', 'geo', 'party', 'demo'] as const);
export type GroupBy = z.infer<typeof GroupByEnum>;

// ========== CORE DATA MODELS ==========

// Vote counts structure used across aggregates
export const CountsSchema = z.object({
  love: z.number().int().min(0),
  like: z.number().int().min(0),
  dislike: z.number().int().min(0),
  hate: z.number().int().min(0),
});
export type Counts = z.infer<typeof CountsSchema>;

// Extended counts with total count
export const CountsWithTotalSchema = CountsSchema.extend({
  n: z.number().int().min(0),
});
export type CountsWithTotal = z.infer<typeof CountsWithTotalSchema>;

// Rate calculations
export const RatesSchema = z.object({
  love: z.number().min(0).max(1),
  like: z.number().min(0).max(1),
  dislike: z.number().min(0).max(1),
  hate: z.number().min(0).max(1),
  favorability: z.number().min(-1).max(1),
});
export type Rates = z.infer<typeof RatesSchema>;

// Message entity schema
export const MessageSchema = z.object({
  id: z.string().uuid(),
  slogan: z.string().min(1).max(240),
  subline: z.string().max(240).optional(),
  status: MessageStatusEnum,
  rank: z.string(), // LexoRank string
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Message = z.infer<typeof MessageSchema>;

// VoteAggregateShard entity schema
export const VoteAggregateShardSchema = z.object({
  id: z.string(), // compositeKey:shardId
  messageId: z.string().uuid(),
  geoBucket: z.string().optional(),
  partyBucket: PartyBucketEnum.optional(),
  demoBucket: z.string().optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^ALL$/), // YYYY-MM-DD or 'ALL'
  counts: CountsSchema,
  updatedAt: z.date(),
  compositeKey: z.string(), // Derived field for convenience
  shardId: z.number().int().min(0).max(15), // 0-15 for 16 shards
});
export type VoteAggregateShard = z.infer<typeof VoteAggregateShardSchema>;

// VoteAggregateRollup entity schema
export const VoteAggregateRollupSchema = z.object({
  id: z.string(), // compositeKey
  messageId: z.string().uuid(),
  geoBucket: z.string().optional(),
  partyBucket: PartyBucketEnum.optional(),
  demoBucket: z.string().optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^ALL$/),
  counts: CountsSchema,
  updatedAt: z.date(),
});
export type VoteAggregateRollup = z.infer<typeof VoteAggregateRollupSchema>;

// A/B Testing Pair entity schema
export const ABPairSchema = z.object({
  id: z.string().uuid(),
  a: z.string().uuid(), // messageId
  b: z.string().uuid(), // messageId
  status: ABPairStatusEnum,
  rank: z.string(), // LexoRank string
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ABPair = z.infer<typeof ABPairSchema>;

// ========== API REQUEST SCHEMAS ==========

// Message creation request
export const MessageCreateSchema = z.object({
  slogan: z.string().min(1).max(240),
  subline: z.string().max(240).optional(),
  status: MessageStatusEnum.default('active'),
});
export type MessageCreateRequest = z.infer<typeof MessageCreateSchema>;

// Message update request
export const MessagePatchSchema = z.object({
  slogan: z.string().min(1).max(240).optional(),
  subline: z.string().max(240).optional(),
  status: MessageStatusEnum.optional(),
});
export type MessagePatchRequest = z.infer<typeof MessagePatchSchema>;

// Message reorder request
export const MessageReorderSchema = z.object({
  id: z.string().uuid(),
  beforeId: z.string().uuid().optional(),
  afterId: z.string().uuid().optional(),
}).refine(
  (data) => data.beforeId || data.afterId,
  { message: "At least one of beforeId or afterId must be provided" }
);
export type MessageReorderRequest = z.infer<typeof MessageReorderSchema>;

// Individual vote in a batch
export const PendingVoteSchema = z.object({
  messageId: z.string().uuid(),
  choice: VoteChoiceNumberEnum,
  votedAtClient: z.string().datetime(), // ISO string
});
export type PendingVote = z.infer<typeof PendingVoteSchema>;

// User context for vote attribution
export const UserContextSchema = z.object({
  geoBucket: z.string().optional(),
  partyBucket: PartyBucketEnum.optional(),
  demoBucket: z.string().optional(),
});
export type UserContext = z.infer<typeof UserContextSchema>;

// Vote batch request
export const VoteBatchSchema = z.object({
  votes: z.array(PendingVoteSchema).min(1).max(100),
  userContext: UserContextSchema.optional(),
  idempotencyKey: z.string().uuid().optional(),
});
export type VoteBatchRequest = z.infer<typeof VoteBatchSchema>;

// Results query filters
export const ResultsFiltersSchema = z.object({
  messageId: z.string().uuid().optional(),
  geo: z.string().or(z.literal('ALL')).optional(),
  party: PartyBucketEnum.or(z.literal('ALL')).optional(),
  demo: z.string().or(z.literal('ALL')).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rollup: z.enum(['true', 'false']).default('false'),
  groupBy: GroupByEnum.default('message'),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
}).refine(
  (data) => !data.from || !data.to || data.from <= data.to,
  { message: "from date must be less than or equal to to date" }
);
export type ResultsFilters = z.infer<typeof ResultsFiltersSchema>;

// A/B Pair creation request
export const ABPairCreateSchema = z.object({
  a: z.string().uuid(),
  b: z.string().uuid(),
  status: ABPairStatusEnum.default('active'),
});
export type ABPairCreateRequest = z.infer<typeof ABPairCreateSchema>;

// A/B Pairs batch request
export const ABPairsBatchSchema = z.object({
  pairs: z.array(z.object({
    id: z.string().uuid(),
    a: z.string().uuid(),
    b: z.string().uuid(),
    status: ABPairStatusEnum,
    rank: z.string(),
  })),
});
export type ABPairsBatchRequest = z.infer<typeof ABPairsBatchSchema>;

// ========== API RESPONSE SCHEMAS ==========

// Standard error response
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Vote batch response
export const VoteBatchResponseSchema = z.object({
  accepted: z.number().int().min(0),
  dropped: z.number().int().min(0),
});
export type VoteBatchResponse = z.infer<typeof VoteBatchResponseSchema>;

// Results analytics item
export const ResultsItemSchema = z.object({
  key: z.string(), // day string, geo code, party/demo bucket, or messageId
  counts: CountsWithTotalSchema,
  rates: RatesSchema,
});
export type ResultsItem = z.infer<typeof ResultsItemSchema>;

// Results analytics response
export const ResultsResponseSchema = z.object({
  groupBy: GroupByEnum,
  items: z.array(ResultsItemSchema),
  totals: CountsWithTotalSchema.optional(),
});
export type ResultsResponse = z.infer<typeof ResultsResponseSchema>;

// Message list response
export const MessageListResponseSchema = z.array(MessageSchema);
export type MessageListResponse = z.infer<typeof MessageListResponseSchema>;

// A/B Pair list response
export const ABPairListResponseSchema = z.array(ABPairSchema);
export type ABPairListResponse = z.infer<typeof ABPairListResponseSchema>;

// ========== UTILITY SCHEMAS ==========

// Idempotency record for deduplication
export const IdempotencyRecordSchema = z.object({
  id: z.string(), // idempotencyKey
  processedAt: z.date(),
  ttl: z.date(), // When this record expires
});
export type IdempotencyRecord = z.infer<typeof IdempotencyRecordSchema>;

// Vote deduplication record
export const VoteDedupeRecordSchema = z.object({
  id: z.string(), // userId or anonSessionId + messageId
  messageId: z.string().uuid(),
  userId: z.string().optional(),
  anonSessionId: z.string().optional(),
  votedAt: z.date(),
  ttl: z.date(), // 24h TTL
});
export type VoteDedupeRecord = z.infer<typeof VoteDedupeRecordSchema>;

// ========== HELPER FUNCTIONS ==========

/**
 * Maps vote choice number to label
 */
export function choiceToLabel(choice: VoteChoiceNumber): keyof Counts {
  const mapping = {
    1: 'love',
    2: 'like', 
    3: 'dislike',
    4: 'hate',
  } as const;
  return mapping[choice];
}

/**
 * Creates composite key for vote aggregation
 */
export function createCompositeKey(
  messageId: string,
  geoBucket?: string,
  partyBucket?: string,
  demoBucket?: string,
  day?: string
): string {
  return `msg=${messageId}|geo=${geoBucket || '-'}|party=${partyBucket || '-'}|demo=${demoBucket || '-'}|day=${day || 'ALL'}`;
}

/**
 * Generates shard ID from message and user context
 */
export function getShardId(messageId: string, userIdentifier: string, shardCount = 16): number {
  // Simple hash function for consistent shard selection
  let hash = 0;
  const str = messageId + userIdentifier;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % shardCount;
}

/**
 * Calculates rates from counts
 */
export function calculateRates(counts: Counts): Rates {
  const total = counts.love + counts.like + counts.dislike + counts.hate;
  if (total === 0) {
    return { love: 0, like: 0, dislike: 0, hate: 0, favorability: 0 };
  }
  
  const favorable = counts.love + counts.like;
  const unfavorable = counts.dislike + counts.hate;
  
  return {
    love: counts.love / total,
    like: counts.like / total,
    dislike: counts.dislike / total,
    hate: counts.hate / total,
    favorability: (favorable - unfavorable) / total,
  };
}

/**
 * Combines multiple counts objects
 */
export function combineCounts(...countsList: Counts[]): Counts {
  return countsList.reduce(
    (acc, counts) => ({
      love: acc.love + counts.love,
      like: acc.like + counts.like,
      dislike: acc.dislike + counts.dislike,
      hate: acc.hate + counts.hate,
    }),
    { love: 0, like: 0, dislike: 0, hate: 0 }
  );
}