import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { createMessage } from '@/lib/messaging-datastore';
import { withRateLimit, adminRateLimiter } from '@/lib/rate-limiting';
import { 
  MessageCreateSchema, 
  MessageSchema, 
  ErrorResponseSchema 
} from '@/lib/messaging-schemas';
import { 
  withAdminAuth, 
  AuthenticatedRequest, 
  validateMethod, 
  setStandardHeaders 
} from '@/lib/admin-auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  setStandardHeaders(res);
  
  if (!validateMethod(req, res, ['POST'])) {
    return;
  }

  try {
    // Validate request body
    const bodyResult = MessageCreateSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid message data: ' + bodyResult.error.issues.map(i => i.message).join(', ')
        }
      });
      return res.status(400).json(errorResponse);
    }

    const { slogan, subline, status } = bodyResult.data;

    // Create message in datastore
    const newMessage = await createMessage(slogan, subline, status);

    // Validate response
    const responseData = MessageSchema.parse(newMessage);

    console.log(`Admin ${req.user.email} created message: ${newMessage.id}`);
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating message:', error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create message'
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

export default withRateLimit(adminRateLimiter, withAdminAuth(handler));