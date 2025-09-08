import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { User } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Check if user has moderator badge or is admin
    const isAdmin = (session.user as any)?.role === 'admin';
    
    if (!isAdmin) {
      const userKey = datastore.key(['User', session.user.id]);
      const [userEntity] = await datastore.get(userKey);
      
      if (!userEntity) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = fromDatastore<User>(userEntity);
      const hasModeratorBadge = user.badges?.some(badge => badge.id === 'badge-community-moderator');

      if (!hasModeratorBadge) {
        return res.status(403).json({ message: 'Moderator badge or admin role required' });
      }
    }

    // Fetch pending posts (comments, suggestions, topics)
    const pendingPosts = [];

    try {
      // Fetch pending comments
      const commentQuery = datastore.createQuery('Comment').filter('status', '=', 'pending');
      const [commentEntities] = await datastore.runQuery(commentQuery);
    
    for (const entity of commentEntities) {
      const comment = fromDatastore(entity) as any;
      // Get author info - handle both authorId and author field
      const authorId = comment.authorId || comment.author?.id;
      if (authorId) {
        const authorKey = datastore.key(['User', authorId]);
        const [authorEntity] = await datastore.get(authorKey);
        const author = authorEntity ? fromDatastore<User>(authorEntity) : null;

        if (author) {
          pendingPosts.push({
            id: comment.id,
            content: comment.text || comment.content || 'No content',
            author: {
              id: author.id,
              displayName: author.displayName || 'Unknown User'
            },
            timestamp: comment.timestamp || new Date().toISOString(),
            type: 'comment',
            flags: comment.flags || 0
          });
        }
      }
    }

      // Fetch pending topic suggestions
      const topicQuery = datastore.createQuery('Topic').filter('status', '=', 'pending');
      const [topicEntities] = await datastore.runQuery(topicQuery);
      
      for (const entity of topicEntities) {
        const topic = fromDatastore(entity) as any;
        // Get suggester info
        const suggesterId = topic.suggesterId;
        if (suggesterId) {
          const suggesterKey = datastore.key(['User', suggesterId]);
          const [suggesterEntity] = await datastore.get(suggesterKey);
          const suggester = suggesterEntity ? fromDatastore<User>(suggesterEntity) : null;

          if (suggester) {
            pendingPosts.push({
              id: topic.id,
              content: `${topic.title || 'Untitled'}\n\n${topic.preview || ''}${topic.problemStatement ? '\n\nProblem: ' + topic.problemStatement : ''}`,
              author: {
                id: suggester.id,
                displayName: suggester.displayName || 'Unknown User'
              },
              timestamp: topic.createdAt || new Date().toISOString(),
              type: 'topic',
              flags: topic.flags || 0
            });
          }
        }
      }
    } catch (datastoreError) {
      console.warn('Error fetching from datastore, returning empty list:', datastoreError);
      // Return empty list if datastore queries fail
    }

    // Sort by timestamp (newest first)
    pendingPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json(pendingPosts);
  } catch (error: any) {
    console.error('Error fetching pending posts:', error);
    res.status(500).json({ message: 'Failed to fetch pending posts', error: error.message });
  }
}