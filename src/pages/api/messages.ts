import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getMessages } from '@/lib/messaging-datastore';
import { withRateLimit, publicReadRateLimiter } from '@/lib/rate-limiting';
import { 
  MessageListResponseSchema, 
  ErrorResponseSchema, 
  MessageStatusEnum 
} from '@/lib/messaging-schemas';
import { 
  validateMethod, 
  setStandardHeaders, 
  setCacheHeaders 
} from '@/lib/admin-auth-middleware';

// Query parameters schema
const QuerySchema = z.object({
  status: MessageStatusEnum.or(z.literal('all')).default('active'),
});

async function messagesHandler(req: NextApiRequest, res: NextApiResponse) {
  setStandardHeaders(res);
  
  if (!validateMethod(req, res, ['GET'])) {
    return;
  }

  try {
    // Validate query parameters
    const queryResult = QuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters: ' + queryResult.error.issues.map(i => i.message).join(', ')
        }
      });
      return res.status(400).json(errorResponse);
    }

    const { status } = queryResult.data;

    // Get messages from datastore
    const messages = await getMessages(status);

    // Validate response
    const responseData = MessageListResponseSchema.parse(messages);

    // Set cache headers for GET requests (30 seconds with stale-while-revalidate)
    setCacheHeaders(res, 30);

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching messages:', error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch messages'
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

// Export the handler with rate limiting applied
export default withRateLimit(publicReadRateLimiter, messagesHandler);