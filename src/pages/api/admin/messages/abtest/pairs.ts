import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { 
  getABPairs, 
  createABPair, 
  updateABPair, 
  deleteABPair,
  getMessage
} from '@/lib/messaging-datastore';
import { 
  ABPairCreateSchema,
  ABPairsBatchSchema,
  ABPairListResponseSchema,
  ErrorResponseSchema,
  ABPair,
  ABPairStatus
} from '@/lib/messaging-schemas';
import { 
  withAdminAuth, 
  AuthenticatedRequest, 
  validateMethod, 
  setStandardHeaders 
} from '@/lib/admin-auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  setStandardHeaders(res);
  
  if (!validateMethod(req, res, ['GET', 'POST', 'PUT'])) {
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get query parameters
      const statusParam = req.query.status as string | undefined;
      let status: ABPairStatus | undefined;
      
      if (statusParam && ['active', 'inactive'].includes(statusParam)) {
        status = statusParam as ABPairStatus;
      }

      // Fetch A/B pairs from datastore
      const pairs = await getABPairs(status);
      
      // Validate response
      const responseData = ABPairListResponseSchema.parse(pairs);
      
      console.log(`Admin ${req.user.email} fetched ${pairs.length} A/B pairs`);
      
      res.status(200).json(responseData);
    }
    else if (req.method === 'POST') {
      // Validate request body for single pair creation
      const bodyResult = ABPairCreateSchema.safeParse(req.body);
      if (!bodyResult.success) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid A/B pair data: ' + bodyResult.error.issues.map(i => i.message).join(', ')
          }
        });
        return res.status(400).json(errorResponse);
      }

      const { a, b, status } = bodyResult.data;

      // Validate that both messages exist
      const [messageA, messageB] = await Promise.all([
        getMessage(a),
        getMessage(b)
      ]);

      if (!messageA) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'Message A not found'
          }
        });
        return res.status(400).json(errorResponse);
      }

      if (!messageB) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'Message B not found'
          }
        });
        return res.status(400).json(errorResponse);
      }

      // Ensure messages are different
      if (a === b) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'INVALID_INPUT',
            message: 'Message A and B must be different'
          }
        });
        return res.status(400).json(errorResponse);
      }

      // Create the A/B pair
      const newPair = await createABPair(a, b, status);
      
      console.log(`Admin ${req.user.email} created A/B pair: ${newPair.id} (${a} vs ${b})`);
      
      res.status(201).json(newPair);
    }
    else if (req.method === 'PUT') {
      // Validate request body for batch update
      const bodyResult = ABPairsBatchSchema.safeParse(req.body);
      if (!bodyResult.success) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid batch data: ' + bodyResult.error.issues.map(i => i.message).join(', ')
          }
        });
        return res.status(400).json(errorResponse);
      }

      const { pairs } = bodyResult.data;
      const updatedPairs: ABPair[] = [];
      const errors: string[] = [];

      // Process each pair update
      for (const pairData of pairs) {
        try {
          const updated = await updateABPair(pairData.id, {
            a: pairData.a,
            b: pairData.b,
            status: pairData.status,
            rank: pairData.rank,
          });

          if (updated) {
            updatedPairs.push(updated);
          } else {
            errors.push(`A/B pair ${pairData.id} not found`);
          }
        } catch (error) {
          console.error('Error updating A/B pair:', pairData.id, error);
          errors.push(`Failed to update A/B pair ${pairData.id}`);
        }
      }

      if (errors.length > 0) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'PARTIAL_FAILURE',
            message: `Some updates failed: ${errors.join(', ')}`
          }
        });
        return res.status(400).json(errorResponse);
      }

      console.log(`Admin ${req.user.email} updated ${updatedPairs.length} A/B pairs`);
      
      res.status(200).json({
        message: 'A/B pairs updated successfully',
        updated: updatedPairs.length,
        pairs: updatedPairs,
      });
    }
  } catch (error) {
    console.error('Error in A/B pairs API:', error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process A/B pairs request'
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

export default withAdminAuth(handler);