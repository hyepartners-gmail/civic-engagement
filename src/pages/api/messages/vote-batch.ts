import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { processVoteBatch } from '@/lib/vote-aggregation-service';
import { checkIdempotency, createIdempotencyRecord } from '@/lib/messaging-datastore';
import { withRateLimit, voteRateLimiter } from '@/lib/rate-limiting';
import { 
  VoteBatchSchema, 
  VoteBatchResponseSchema, 
  ErrorResponseSchema 
} from '@/lib/messaging-schemas';
import { 
  validateMethod, 
  setStandardHeaders, 
  getAnonSessionId, 
  setAnonSessionCookie,
  requireAuth,
  AuthenticatedRequest,
  getUserContextFromAuth
} from '@/lib/admin-auth-middleware';

async function voteHandler(req: NextApiRequest, res: NextApiResponse) {
  setStandardHeaders(res);
  
  if (!validateMethod(req, res, ['POST'])) {
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
      return res.status(400).json(errorResponse);
    }

    const { votes, userContext, idempotencyKey } = bodyResult.data;

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || uuidv4();

    // Check idempotency
    const alreadyProcessed = await checkIdempotency(finalIdempotencyKey);
    if (alreadyProcessed) {
      const response = VoteBatchResponseSchema.parse({
        accepted: 0,
        dropped: votes.length,
      });
      return res.status(200).json(response);
    }

    // Try to get authenticated user context
    let userId: string | undefined;
    let finalUserContext = userContext || {};
    
    try {
      const authReq = await requireAuth(req, res);
      if (authReq) {
        userId = authReq.user.id;
        // Merge authenticated user context with provided context
        const authUserContext = getUserContextFromAuth(authReq);
        finalUserContext = {
          ...authUserContext,
          ...userContext, // User-provided context takes precedence
        };
      }
    } catch (error) {
      // Authentication failed - continue as anonymous user
      console.log('Vote batch request from anonymous user');
    }

    // Handle anonymous session for deduplication
    let anonSessionId = getAnonSessionId(req);
    if (!userId && !anonSessionId) {
      // Generate new anonymous session ID
      anonSessionId = uuidv4();
      setAnonSessionCookie(res, anonSessionId);
    }

    // Process the vote batch
    const result = await processVoteBatch(
      votes,
      finalUserContext,
      userId,
      anonSessionId
    );

    // Create idempotency record to prevent reprocessing
    await createIdempotencyRecord(finalIdempotencyKey);

    // Log vote processing results
    console.log(`Vote batch processed: ${result.accepted} accepted, ${result.dropped} dropped, ${result.errors.length} errors`);
    if (result.errors.length > 0) {
      console.warn('Vote processing errors:', result.errors);
    }

    // Validate and return response
    const response = VoteBatchResponseSchema.parse({
      accepted: result.accepted,
      dropped: result.dropped,
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing vote batch:', error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process vote batch'
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

// Export the handler with rate limiting applied
export default withRateLimit(voteRateLimiter, voteHandler);