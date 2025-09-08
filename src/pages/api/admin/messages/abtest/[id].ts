import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { updateABPair, deleteABPair, getABPairs } from '@/lib/messaging-datastore';
import { 
  ABPairSchema,
  ErrorResponseSchema,
  ABPairStatus
} from '@/lib/messaging-schemas';
import { 
  withAdminAuth, 
  AuthenticatedRequest, 
  validateMethod, 
  setStandardHeaders 
} from '@/lib/admin-auth-middleware';

// Path parameter schema
const ParamsSchema = z.object({
  id: z.string().uuid('Invalid A/B pair ID format'),
});

// Update schema for PATCH requests
const ABPairPatchSchema = z.object({
  a: z.string().uuid().optional(),
  b: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  rank: z.string().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  setStandardHeaders(res);
  
  if (!validateMethod(req, res, ['GET', 'PATCH', 'DELETE'])) {
    return;
  }

  try {
    // Validate path parameters
    const paramsResult = ParamsSchema.safeParse(req.query);
    if (!paramsResult.success) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INVALID_PARAMS',
          message: 'Invalid A/B pair ID: ' + paramsResult.error.issues.map(i => i.message).join(', ')
        }
      });
      return res.status(400).json(errorResponse);
    }

    const { id } = paramsResult.data;

    if (req.method === 'GET') {
      // Get all pairs and find the specific one
      const allPairs = await getABPairs();
      const pair = allPairs.find(p => p.id === id);
      
      if (!pair) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'A/B pair not found'
          }
        });
        return res.status(404).json(errorResponse);
      }

      // Validate response
      const responseData = ABPairSchema.parse(pair);
      
      console.log(`Admin ${req.user.email} fetched A/B pair: ${id}`);
      
      res.status(200).json(responseData);
    }
    else if (req.method === 'PATCH') {
      // Validate request body for updates
      const bodyResult = ABPairPatchSchema.safeParse(req.body);
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

      // Validate that A and B are different if both are being updated
      if (updates.a && updates.b && updates.a === updates.b) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'INVALID_INPUT',
            message: 'Message A and B must be different'
          }
        });
        return res.status(400).json(errorResponse);
      }

      // Update A/B pair
      const updatedPair = await updateABPair(id, updates);
      if (!updatedPair) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'A/B pair not found'
          }
        });
        return res.status(404).json(errorResponse);
      }

      // Validate response
      const responseData = ABPairSchema.parse(updatedPair);

      console.log(`Admin ${req.user.email} updated A/B pair: ${id}`, updates);
      
      res.status(200).json(responseData);
    } 
    else if (req.method === 'DELETE') {
      // Delete A/B pair
      const success = await deleteABPair(id);
      if (!success) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete A/B pair'
          }
        });
        return res.status(500).json(errorResponse);
      }

      console.log(`Admin ${req.user.email} deleted A/B pair: ${id}`);
      
      res.status(204).end();
    }
  } catch (error) {
    console.error(`Error ${req.method}ing A/B pair:`, error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to ${req.method?.toLowerCase()} A/B pair`
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

export default withAdminAuth(handler);