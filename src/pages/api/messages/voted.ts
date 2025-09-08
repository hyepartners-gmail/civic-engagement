import type { NextApiRequest, NextApiResponse } from 'next';
import { checkVoteDedupe } from '@/lib/messaging-datastore';
import { withRateLimit, publicReadRateLimiter } from '@/lib/rate-limiting';
import { 
  ErrorResponseSchema 
} from '@/lib/messaging-schemas';
import { 
  validateMethod, 
  setStandardHeaders,
  getAnonSessionId
} from '@/lib/admin-auth-middleware';

async function votedMessagesHandler(req: NextApiRequest, res: NextApiResponse) {
  setStandardHeaders(res);
  
  if (!validateMethod(req, res, ['GET'])) {
    return;
  }

  try {
    // Get user ID from session or anonymous session ID
    const userId = (req as any).user?.id;
    const anonSessionId = getAnonSessionId(req); // Corrected: Pass only req
    
    // Get message IDs from query parameters
    const messageIdsParam = req.query.messageIds;
    let messageIds: string[] = [];
    
    if (Array.isArray(messageIdsParam)) {
      messageIds = messageIdsParam as string[];
    } else if (typeof messageIdsParam === 'string') {
      messageIds = messageIdsParam.split(',');
    }
    
    if (messageIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'messageIds parameter is required'
        }
      });
    }
    
    // Check each message ID to see if the user has voted on it
    const votedMessageIds: string[] = [];
    
    for (const messageId of messageIds) {
      const hasVoted = await checkVoteDedupe(messageId, userId, anonSessionId);
      if (hasVoted) {
        votedMessageIds.push(messageId);
      }
    }
    
    res.status(200).json({ votedMessageIds });
  } catch (error) {
    console.error('Error checking voted messages:', error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check voted messages'
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

// Export the handler with rate limiting applied
export default withRateLimit(publicReadRateLimiter, votedMessagesHandler);