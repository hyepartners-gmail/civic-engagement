import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { getMessages, updateMessageRank, getMessage } from '@/lib/messaging-datastore';
import { generateRankBetween, needsRebalance, rebalanceRanks, LexoRankManager } from '@/lib/lexorank';
import { 
  MessageReorderSchema, 
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
    const bodyResult = MessageReorderSchema.safeParse(req.body);
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

    // Check if the message to reorder exists
    const messageToReorder = await getMessage(id);
    if (!messageToReorder) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'Message to reorder not found'
        }
      });
      return res.status(404).json(errorResponse);
    }

    // Get all messages to understand current ordering
    const allMessages = await getMessages('all');
    const currentRanks = allMessages.map(m => m.rank);
    
    // Validate that beforeId and afterId exist if provided
    if (beforeId) {
      const beforeMessage = allMessages.find(m => m.id === beforeId);
      if (!beforeMessage) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'Before message not found'
          }
        });
        return res.status(400).json(errorResponse);
      }
    }

    if (afterId) {
      const afterMessage = allMessages.find(m => m.id === afterId);
      if (!afterMessage) {
        const errorResponse = ErrorResponseSchema.parse({
          error: {
            code: 'NOT_FOUND',
            message: 'After message not found'
          }
        });
        return res.status(400).json(errorResponse);
      }
    }

    // Get the rank constraints
    let beforeRank: string | undefined;
    let afterRank: string | undefined;

    if (beforeId) {
      const beforeMessage = allMessages.find(m => m.id === beforeId);
      beforeRank = beforeMessage?.rank;
    }

    if (afterId) {
      const afterMessage = allMessages.find(m => m.id === afterId);
      afterRank = afterMessage?.rank;
    }

    // Check if rebalancing is needed first
    const rankManager = new LexoRankManager(currentRanks);
    const rebalanceMap = rankManager.rebalanceIfNeeded();

    if (rebalanceMap) {
      // Apply rebalancing to all messages first
      console.log(`Rebalancing ${rebalanceMap.size} message ranks`);
      
      const rebalancePromises = Array.from(rebalanceMap.entries()).map(([oldRank, newRank]) => {
        const messageToUpdate = allMessages.find(m => m.rank === oldRank);
        if (messageToUpdate) {
          return updateMessageRank(messageToUpdate.id, newRank);
        }
        return Promise.resolve(null);
      });

      await Promise.all(rebalancePromises);

      // Update our reference data with new ranks
      for (const [oldRank, newRank] of Array.from(rebalanceMap.entries())) {
        const message = allMessages.find(m => m.rank === oldRank);
        if (message) {
          message.rank = newRank;
        }
      }

      // Update rank constraints after rebalancing
      if (beforeId) {
        const beforeMessage = allMessages.find(m => m.id === beforeId);
        beforeRank = beforeMessage?.rank;
      }

      if (afterId) {
        const afterMessage = allMessages.find(m => m.id === afterId);
        afterRank = afterMessage?.rank;
      }
    }

    // Generate new rank for the message being reordered
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

    // Update the message with the new rank
    const updatedMessage = await updateMessageRank(id, newRank);
    if (!updatedMessage) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update message rank'
        }
      });
      return res.status(500).json(errorResponse);
    }

    console.log(`Admin ${req.user.email} reordered message ${id} to rank ${newRank}`);
    
    // Return the updated message
    res.status(200).json({
      message: 'Message reordered successfully',
      updatedMessage,
      rebalanced: !!rebalanceMap,
      rebalancedCount: rebalanceMap ? rebalanceMap.size : 0,
    });

  } catch (error) {
    console.error('Error reordering message:', error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reorder message'
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

export default withAdminAuth(handler);