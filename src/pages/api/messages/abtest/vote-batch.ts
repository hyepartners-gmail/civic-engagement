import type { NextApiRequest, NextApiResponse } from 'next';
import { processVoteBatch } from '@/lib/vote-aggregation-service';
import { deriveAllBuckets } from '@/lib/bucket-derivation';
import { withRateLimit, voteRateLimiter } from '@/lib/rate-limiting';
import { 
  VoteBatchSchema, 
  VoteBatchResponseSchema, 
  ErrorResponseSchema,
  UserContextSchema 
} from '@/lib/messaging-schemas';
import { getSession } from 'next-auth/react';

async function abTestVoteHandler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS and cache headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is allowed'
      }
    });
    res.status(405).json(errorResponse);
    return;
  }

  try {
    // Validate request body
    const bodyResult = VoteBatchSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid vote batch data: ' + bodyResult.error.issues.map(i => i.message).join(', ')
        }
      });
      res.status(400).json(errorResponse);
      return;
    }

    const { votes, userContext, idempotencyKey } = bodyResult.data;

    // Get session for user context
    const session = await getSession({ req });
    const userId = session?.user?.id;

    // Generate or get anonymous session ID from cookies
    let anonSessionId = req.cookies['anon-session-id'];
    if (!anonSessionId) {
      anonSessionId = require('uuid').v4();
      res.setHeader('Set-Cookie', [
        `anon-session-id=${anonSessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}` // 30 days
      ]);
    }

    // Derive user context from session/profile if not provided
    let finalUserContext = userContext;
    if (!finalUserContext && session?.user) {
      // Try to derive context from user profile
      const userProfile = (session.user as any).profile || {};
      finalUserContext = deriveAllBuckets(userProfile);
    }

    // Validate user context if provided
    if (finalUserContext) {
      const contextResult = UserContextSchema.safeParse(finalUserContext);
      if (!contextResult.success) {
        console.warn('Invalid user context provided, ignoring:', finalUserContext);
        finalUserContext = undefined;
      } else {
        finalUserContext = contextResult.data;
      }
    }

    // Special handling for A/B testing votes:
    // A/B votes typically come in pairs (one vote for message A, one for message B)
    // but the vote processing is the same as regular votes
    
    console.log(`Processing A/B vote batch: ${votes.length} votes from ${userId || anonSessionId}`);

    // Process the vote batch using the existing vote aggregation service
    const result = await processVoteBatch(
      votes,
      finalUserContext || {},
      userId,
      anonSessionId
    );

    // Validate response
    const responseData = VoteBatchResponseSchema.parse({
      accepted: result.accepted,
      dropped: result.dropped,
    });

    console.log(`A/B vote batch processed: ${result.accepted} accepted, ${result.dropped} dropped`);
    
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error processing A/B vote batch:', error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process A/B vote batch'
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

// Export the handler with rate limiting applied
export default withRateLimit(voteRateLimiter, abTestVoteHandler);