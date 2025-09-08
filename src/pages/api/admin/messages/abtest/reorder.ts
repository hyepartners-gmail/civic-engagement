import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { getABPairs, updateABPair } from '@/lib/messaging-datastore';
import { generateRankBetween, needsRebalance, rebalanceRanks, LexoRankManager } from '@/lib/lexorank';
import { 
  ErrorResponseSchema 
} from '@/lib/messaging-schemas';
import { 
  withAdminAuth, 
  AuthenticatedRequest, 
  validateMethod, 
  setStandardHeaders 
} from '@/lib/admin-auth-middleware';

// Request schema for reordering A/B pairs
const ABPairReorderSchema = z.object({
  id: z.string().uuid(),
  beforeId: z.string().uuid().optional(),
  afterId: z.string().uuid().optional(),
}).refine(
  (data) => data.beforeId || data.afterId,
  { message: "At least one of beforeId or afterId must be provided" }
);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  setStandardHeaders(res);
  
  if (!validateMethod(req, res, ['POST'])) {
    return;
  }

  try {
    // Validate request body
    const bodyResult = ABPairReorderSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid reorder data: ' + bodyResult.error.issues.map(i => i.message).join(', ')
        }
      });
      return res.status(400).json(errorResponse);
    }

    const { id, beforeId, afterId } = bodyResult.data;

    // Get all A/B pairs to understand current ordering
    const allPairs = await getABPairs();
    const currentRanks = allPairs.map(p => p.rank);
    
    // Check if the A/B pair to reorder exists
    const pairToReorder = allPairs.find(p => p.id === id);
    if (!pairToReorder) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'A/B pair to reorder not found'
        }
      });
      return res.status(404).json(errorResponse);
    }

    // Validate that beforeId and afterId exist if provided
    if (beforeId) {
      const beforePair = allPairs.find(p => p.id === beforeId);
      if (!beforePair) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'Before A/B pair not found'
          }
        });
        return res.status(400).json(errorResponse);
      }
    }

    if (afterId) {
      const afterPair = allPairs.find(p => p.id === afterId);
      if (!afterPair) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'After A/B pair not found'
          }
        });
        return res.status(400).json(errorResponse);
      }
    }

    // Get the rank constraints
    let beforeRank: string | undefined;
    let afterRank: string | undefined;

    if (beforeId) {
      const beforePair = allPairs.find(p => p.id === beforeId);
      beforeRank = beforePair?.rank;
    }

    if (afterId) {
      const afterPair = allPairs.find(p => p.id === afterId);
      afterRank = afterPair?.rank;
    }

    // Check if rebalancing is needed first
    const rankManager = new LexoRankManager(currentRanks);
    const rebalanceMap = rankManager.rebalanceIfNeeded();

    if (rebalanceMap) {
      // Apply rebalancing to all A/B pairs first
      console.log(`Rebalancing ${rebalanceMap.size} A/B pair ranks`);
      
      const rebalancePromises = Array.from(rebalanceMap.entries()).map(([oldRank, newRank]) => {
        const pairToUpdate = allPairs.find(p => p.rank === oldRank);
        if (pairToUpdate) {
          return updateABPair(pairToUpdate.id, { rank: newRank });
        }
        return Promise.resolve(null);
      });

      await Promise.all(rebalancePromises);

      // Update our reference data with new ranks
      for (const [oldRank, newRank] of Array.from(rebalanceMap.entries())) {
        const pair = allPairs.find(p => p.rank === oldRank);
        if (pair) {
          pair.rank = newRank;
        }
      }

      // Update rank constraints after rebalancing
      if (beforeId) {
        const beforePair = allPairs.find(p => p.id === beforeId);
        beforeRank = beforePair?.rank;
      }

      if (afterId) {
        const afterPair = allPairs.find(p => p.id === afterId);
        afterRank = afterPair?.rank;
      }
    }

    // Generate new rank for the A/B pair being reordered
    let newRank: string;
    try {
      newRank = generateRankBetween(beforeRank, afterRank);
    } catch (error) {
      console.error('Error generating rank between:', { beforeRank, afterRank }, error);
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to calculate new position'
        }
      });
      return res.status(500).json(errorResponse);
    }

    // Update the A/B pair with the new rank
    const updatedPair = await updateABPair(id, { rank: newRank });
    if (!updatedPair) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update A/B pair rank'
        }
      });
      return res.status(500).json(errorResponse);
    }

    console.log(`Admin ${req.user.email} reordered A/B pair ${id} to rank ${newRank}`);
    
    // Return the updated A/B pair
    res.status(200).json({
      message: 'A/B pair reordered successfully',
      updatedPair,
      rebalanced: !!rebalanceMap,
      rebalancedCount: rebalanceMap ? rebalanceMap.size : 0,
    });

  } catch (error) {
    console.error('Error reordering A/B pair:', error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reorder A/B pair'
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

export default withAdminAuth(handler);