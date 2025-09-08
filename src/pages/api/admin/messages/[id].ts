import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { updateMessage, deleteMessage, getMessage } from '@/lib/messaging-datastore';
import { 
  MessagePatchSchema, 
  MessageSchema, 
  ErrorResponseSchema 
} from '@/lib/messaging-schemas';
import { 
  withAdminAuth, 
  AuthenticatedRequest, 
  validateMethod, 
  setStandardHeaders 
} from '@/lib/admin-auth-middleware';

// Path parameter schema
const ParamsSchema = z.object({
  id: z.string().uuid('Invalid message ID format'),
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  setStandardHeaders(res);
  
  if (!validateMethod(req, res, ['PATCH', 'DELETE'])) {
    return;
  }

  try {
    // Validate path parameters
    const paramsResult = ParamsSchema.safeParse(req.query);
    if (!paramsResult.success) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INVALID_PARAMS',
          message: 'Invalid message ID: ' + paramsResult.error.issues.map(i => i.message).join(', ')
        }
      });
      return res.status(400).json(errorResponse);
    }

    const { id } = paramsResult.data;

    // Check if message exists
    const existingMessage = await getMessage(id);
    if (!existingMessage) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'Message not found'
        }
      });
      return res.status(404).json(errorResponse);
    }

    if (req.method === 'PATCH') {
      // Validate request body for updates
      const bodyResult = MessagePatchSchema.safeParse(req.body);
      if (!bodyResult.success) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid update data: ' + bodyResult.error.issues.map(i => i.message).join(', ')
          }
        });
        return res.status(400).json(errorResponse);
      }

      const updates = bodyResult.data;

      // Check if there are any updates to apply
      if (Object.keys(updates).length === 0) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'INVALID_INPUT',
            message: 'No valid fields to update'
          }
        });
        return res.status(400).json(errorResponse);
      }

      // Update message
      const updatedMessage = await updateMessage(id, updates);
      if (!updatedMessage) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'Message not found'
          }
        });
        return res.status(404).json(errorResponse);
      }

      // Validate response
      const responseData = MessageSchema.parse(updatedMessage);

      console.log(`Admin ${req.user.email} updated message: ${id}`, updates);
      
      res.status(200).json(responseData);
    } 
    else if (req.method === 'DELETE') {
      // Delete message
      const success = await deleteMessage(id);
      if (!success) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete message'
          }
        });
        return res.status(500).json(errorResponse);
      }

      console.log(`Admin ${req.user.email} deleted message: ${id}`);
      
      res.status(204).end();
    }
  } catch (error) {
    console.error(`Error ${req.method}ing message:`, error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to ${req.method?.toLowerCase()} message`
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

export default withAdminAuth(handler);