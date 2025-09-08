import type { NextApiRequest, NextApiResponse } from 'next';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { DUMMY_TOPICS } from '@/lib/dummy-data';
import { Topic, Solution, Amendment } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Fetch all approved topics
      const query = datastore.createQuery('Topic').filter('status', '=', 'approved');
      const [entities] = await datastore.runQuery(query);
      
      let topics: Topic[] = [];
      if (entities.length > 0) {
        topics = entities.map(entity => fromDatastore<Topic>(entity));
        console.log('Fetched topics from Datastore for amendments.');
      } else {
        console.log('No topics in Datastore, using dummy data for amendments.');
        topics = DUMMY_TOPICS.filter(topic => topic.status === 'approved');
      }

      // Fetch amendment overrides
      const overrideQuery = datastore.createQuery('AmendmentOverride');
      const [overrideEntities] = await datastore.runQuery(overrideQuery);
      const overrides = new Map();
      overrideEntities.forEach(entity => {
        const override = fromDatastore(entity) as any;
        overrides.set(override.id, override);
      });

      // Generate amendments from topics with winning solutions
      const potentialAmendments: Array<{
        topic: Topic;
        winningSolution: Solution;
        amendmentText: string;
        totalVotes: number;
      }> = [];

      for (const topic of topics) {
        if (topic.solutions && topic.solutions.length > 0) {
          // Find the winning solution (highest votes)
          const winningSolution = topic.solutions.reduce((prev, current) => 
            (current.votes || 0) > (prev.votes || 0) ? current : prev
          );

          // Only create amendment if the winning solution has votes
          if (winningSolution.votes && winningSolution.votes > 0) {
            const amendmentText = generateAmendmentText(topic, winningSolution);
            
            potentialAmendments.push({
              topic,
              winningSolution,
              amendmentText,
              totalVotes: winningSolution.votes
            });
          }
        }
      }

      // Sort by total votes (descending) to show most popular first
      potentialAmendments.sort((a, b) => b.totalVotes - a.totalVotes);

      // Number them starting from 28 (after the current 27 amendments)
      const amendments: Amendment[] = potentialAmendments.map((potential, index) => {
        const amendmentId = `amendment-${potential.topic.id}`;
        const override = overrides.get(amendmentId);
        const originalText = potential.amendmentText;
        
        return {
          id: amendmentId,
          amendmentNumber: 28 + index,
          title: override?.overriddenTitle || `Amendment Based on "${potential.topic.title}"`,
          basedOnTopic: potential.topic.id,
          winningSolution: potential.winningSolution,
          amendmentText: override?.overriddenText || originalText,
          totalVotes: potential.totalVotes,
          status: 'active',
          isOverridden: !!override,
          originalAmendmentText: override ? originalText : undefined,
          overriddenBy: override?.overriddenBy,
          overriddenAt: override?.overriddenAt
        };
      });

      res.status(200).json(amendments);
    } catch (error: any) {
      console.error('Error generating amendments:', error);
      res.status(500).json({ message: 'Failed to generate amendments', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

function generateAmendmentText(topic: Topic, winningSolution: Solution): string {
  // Generate constitutional amendment text based on the topic and winning solution
  const topicType = topic.changeType || 'law';
  
  switch (topicType) {
    case 'amendment':
      return `Section 1. ${winningSolution.title}

${winningSolution.description}

Section 2. This amendment shall take effect immediately upon ratification.

Section 3. Congress shall have power to enforce this amendment by appropriate legislation.`;

    case 'law':
      return `Proposed Legislation: ${topic.title}

WHEREAS, the people have identified the need to address ${topic.title.toLowerCase()};

WHEREAS, the winning solution "${winningSolution.title}" received ${winningSolution.votes} votes from the citizenry;

NOW, THEREFORE, BE IT ENACTED that:

Section 1. ${winningSolution.title}

Section 2. Implementation: ${winningSolution.description}

Section 3. This act shall take effect 90 days after enactment.`;

    case 'rule':
      return `Proposed Rule Change: ${topic.title}

Based on citizen input, the following rule change is proposed:

Rule: ${winningSolution.title}

Description: ${winningSolution.description}

This rule change received ${winningSolution.votes} votes from participating citizens.

Effective Date: Upon adoption by the relevant governing body.`;

    default:
      return `Proposed Change: ${topic.title}

The citizens have spoken on the issue of "${topic.title}" with the following winning solution:

${winningSolution.title}

Implementation Details:
${winningSolution.description}

This proposal received ${winningSolution.votes} votes and represents the will of the people on this matter.`;
  }
}