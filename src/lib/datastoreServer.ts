import { Datastore } from '@google-cloud/datastore';
import { Topic, User, Comment, Solution } from '../types';
import { DUMMY_TOPICS, DUMMY_COMMENTS } from './dummy-data';
import { DUMMY_USERS } from './dummy-users';

const DATASTORE_NAMESPACE = 'civic-engagement';

let datastore: Datastore;

const projectId = process.env.GOOGLE_CLOUD_PROJECT;

console.log('DatastoreServer: Initializing Datastore...');
console.log('DatastoreServer: GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'NOT SET');
console.log('DatastoreServer: GOOGLE_CLOUD_PROJECT:', projectId || 'NOT SET');

try {
  datastore = new Datastore({
    namespace: DATASTORE_NAMESPACE,
    projectId: projectId,
  });
  console.log('DatastoreServer: Datastore client initialized successfully.');
} catch (e) {
  console.error('DatastoreServer: Failed to initialize Datastore client:', e);
  throw e;
}

function fromDatastore<T>(entity: any): T {
  // console.log('fromDatastore: Incoming entity:', entity); // Keep this for full context if needed
  // console.log('fromDatastore: Entity Datastore.KEY:', entity[Datastore.KEY]); // Keep this for full context if needed
  // console.log('fromDatastore: Entity Datastore.KEY.id:', entity[Datastore.KEY]?.id); // Keep this for full context if needed

  const constructedId = String(entity[Datastore.KEY]?.id || entity[Datastore.KEY]?.name);
  
  const newObject = {
    ...entity,
    id: constructedId, // Assign the constructed ID
    amendmentText: (entity.amendmentText || '') + 
                   (entity.amendmentTextContinued || '') + 
                   (entity.amendmentTextContinued2 || ''),
    amendmentTextContinued: undefined,
    amendmentTextContinued2: undefined,
  };
  delete newObject[Datastore.KEY];
  
  console.log(`fromDatastore: Entity processed. Final ID: ${newObject.id}`); // <-- Added this log
  return newObject as T;
}

export { datastore, fromDatastore, DATASTORE_NAMESPACE };