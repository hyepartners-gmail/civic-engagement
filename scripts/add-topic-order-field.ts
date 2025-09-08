import { datastore, fromDatastore } from '../src/lib/datastoreServer';
import { Topic } from '../src/types';

async function addTopicOrderField() {
  try {
    console.log('Starting script to add order field to topics...');

    const query = datastore.createQuery('Topic');
    const [entities] = await datastore.runQuery(query);
    
    const topics = entities.map((entity: any) => fromDatastore<Topic>(entity)); // Explicitly type entity as any
    
    console.log(`Found ${topics.length} topics. Adding order field...`);

    const updates = topics.map(async (topic, index) => {
      const kind = 'Topic';
      const topicId = !isNaN(Number(topic.id)) ? Number(topic.id) : topic.id;
      const topicKey = datastore.key([kind, topicId]);
      
      // Only update if order is not already set
      if (topic.order === undefined || topic.order === null) {
        const updatedTopic: Topic = {
          ...topic,
          order: index,
        };
        
        await datastore.save({
          key: topicKey,
          data: { ...updatedTopic, id: undefined },
        });
        return updatedTopic;
      }
      return topic; // Return original if no update needed
    });
    
    await Promise.all(updates);
    
    console.log(`Successfully added/updated order fields for ${topics.length} topics.`);
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

addTopicOrderField();