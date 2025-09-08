import type { NextApiResponse } from 'next';
import { aggregateVoteResults } from '@/lib/vote-aggregation-service';
import { 
  ResultsFiltersSchema, 
  ResultsResponseSchema, 
  ErrorResponseSchema 
} from '@/lib/messaging-schemas';
import { 
  withAdminAuth, 
  AuthenticatedRequest, 
  validateMethod, 
  setStandardHeaders,
  setCacheHeaders
} from '@/lib/admin-auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  setStandardHeaders(res);
  
  if (!validateMethod(req, res, ['GET'])) {
    return;
  }

  try {
    // Validate query parameters
    const queryResult = ResultsFiltersSchema.safeParse(req.query);
    if (!queryResult.success) {
      const errorResponse = ErrorResponseSchema.parse({
        error: {
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters: ' + queryResult.error.issues.map(i => i.message).join(', ')
        }
      });
      return res.status(400).json(errorResponse);
    }

    const filters = queryResult.data;

    // Aggregate vote results based on filters
    const results = await aggregateVoteResults(filters);

    // Validate response
    const responseData = ResultsResponseSchema.parse(results);

    // Set cache headers for analytics data (30 seconds with stale-while-revalidate)
    setCacheHeaders(res, 30);

    console.log(`Admin ${req.user.email} queried results:`, {
      groupBy: filters.groupBy,
      itemCount: results.items.length,
      filters: {
        messageId: filters.messageId,
        geo: filters.geo,
        party: filters.party,
        demo: filters.demo,
        dateRange: filters.from && filters.to ? `${filters.from} to ${filters.to}` : 'all',
      },
    });

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching vote results:', error);
    
    const errorResponse = ErrorResponseSchema.parse({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch vote results'
      }
    });
    
    res.status(500).json(errorResponse);
  }
}

export default withAdminAuth(handler);