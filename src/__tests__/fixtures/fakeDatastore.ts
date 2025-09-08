import { Entity, Key, Query, Transaction } from '@google-cloud/datastore';

export interface DatastoreEntry {
  key: Key;
  data: any;
}

export interface FakeDatastoreConfig {
  enableEventualConsistency?: boolean;
  rollupDelay?: number; // ms delay for rollup materialization
}

/**
 * In-memory fake Datastore implementation for testing
 * Provides the same interface as Google Cloud Datastore
 */
export class FakeDatastore {
  private entities = new Map<string, DatastoreEntry>();
  private config: FakeDatastoreConfig;
  private transactions = new Map<string, FakeTransaction>();

  constructor(config: FakeDatastoreConfig = {}) {
    this.config = {
      enableEventualConsistency: false,
      rollupDelay: 0,
      ...config,
    };
  }

  // === UTILITY METHODS ===

  private serializeKey(key: Key): string {
    const path = key.path;
    return path.join('::');
  }

  private createKey(kind: string, id?: string | number): Key {
    const path = id ? [kind, id] : [kind];
    return {
      path,
      kind,
      id: id?.toString(),
      name: typeof id === 'string' ? id : undefined,
      namespace: undefined,
    } as Key;
  }

  clear(): void {
    this.entities.clear();
    this.transactions.clear();
  }

  // === DATASTORE API METHODS ===

  key(path: (string | number)[]): Key {
    const kind = path[0] as string;
    const id = path.length > 1 ? path[1] : undefined;
    return this.createKey(kind, id);
  }

  async save(entityOrEntities: { key: Key; data: any } | { key: Key; data: any }[]): Promise<void> {
    const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
    
    for (const entity of entities) {
      const keyStr = this.serializeKey(entity.key);
      
      // Simulate eventual consistency delay if enabled
      if (this.config.enableEventualConsistency && this.config.rollupDelay! > 0) {
        setTimeout(() => {
          this.entities.set(keyStr, {
            key: entity.key,
            data: { ...entity.data },
          });
        }, this.config.rollupDelay);
      } else {
        this.entities.set(keyStr, {
          key: entity.key,
          data: { ...entity.data },
        });
      }
    }
  }

  async get(keys: Key | Key[]): Promise<[Entity | Entity[]]> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const results: (Entity | null)[] = [];

    for (const key of keyArray) {
      const keyStr = this.serializeKey(key);
      const entry = this.entities.get(keyStr);
      
      if (entry) {
        const entity = {
          ...entry.data,
          [Symbol.for('KEY')]: entry.key,
        } as Entity;
        results.push(entity);
      } else {
        results.push(null);
      }
    }

    return [Array.isArray(keys) ? results : results[0]] as [Entity | Entity[]];
  }

  async delete(keys: Key | Key[]): Promise<void> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    
    for (const key of keyArray) {
      const keyStr = this.serializeKey(key);
      this.entities.delete(keyStr);
    }
  }

  createQuery(kind: string): FakeQuery {
    return new FakeQuery(kind, this);
  }

  async runQuery(query: FakeQuery): Promise<[Entity[]]> {
    const entities = Array.from(this.entities.values())
      .filter(entry => entry.key.kind === query.kind)
      .map(entry => ({
        ...entry.data,
        [Symbol.for('KEY')]: entry.key,
      }) as Entity);

    // Apply filters
    let filteredEntities = entities;
    for (const filter of query.filters) {
      filteredEntities = filteredEntities.filter(entity => {
        const value = entity[filter.property];
        switch (filter.operator) {
          case '=':
            return value === filter.value;
          case '>':
            return value > filter.value;
          case '>=':
            return value >= filter.value;
          case '<':
            return value < filter.value;
          case '<=':
            return value <= filter.value;
          default:
            return true;
        }
      });
    }

    // Apply ordering
    if (query.orders.length > 0) {
      filteredEntities.sort((a, b) => {
        for (const order of query.orders) {
          const aVal = a[order.property];
          const bVal = b[order.property];
          
          let comparison = 0;
          if (aVal < bVal) comparison = -1;
          else if (aVal > bVal) comparison = 1;
          
          if (comparison !== 0) {
            return order.descending ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    // Apply limit
    if (query.limitVal > 0) {
      filteredEntities = filteredEntities.slice(0, query.limitVal);
    }

    return [filteredEntities];
  }

  transaction(): FakeTransaction {
    const transactionId = Math.random().toString(36);
    const transaction = new FakeTransaction(transactionId, this);
    this.transactions.set(transactionId, transaction);
    return transaction;
  }

  // === TEST UTILITIES ===

  getEntityCount(): number {
    return this.entities.size;
  }

  getAllEntities(): DatastoreEntry[] {
    return Array.from(this.entities.values());
  }

  getEntitiesByKind(kind: string): DatastoreEntry[] {
    return this.getAllEntities().filter(entry => entry.key.kind === kind);
  }
}

class FakeQuery {
  public filters: Array<{ property: string; operator: string; value: any }> = [];
  public orders: Array<{ property: string; descending: boolean }> = [];
  public limitVal = 0;

  constructor(
    public kind: string,
    private datastore: FakeDatastore
  ) {}

  filter(property: string, operator: string, value: any): this {
    this.filters.push({ property, operator, value });
    return this;
  }

  order(property: string, options?: { descending?: boolean }): this {
    this.orders.push({ 
      property, 
      descending: options?.descending || false 
    });
    return this;
  }

  limit(limit: number): this {
    this.limitVal = limit;
    return this;
  }
}

class FakeTransaction {
  private operations: Array<{ type: 'save' | 'delete'; key: Key; data?: any }> = [];
  private isActive = false;

  constructor(
    private id: string,
    private datastore: FakeDatastore
  ) {}

  async run(): Promise<void> {
    this.isActive = true;
    this.operations = [];
  }

  async get(keys: Key | Key[]): Promise<[Entity | Entity[]]> {
    if (!this.isActive) {
      throw new Error('Transaction not started');
    }
    // For now, just delegate to datastore get
    return this.datastore.get(keys);
  }

  save(entityOrEntities: { key: Key; data: any } | { key: Key; data: any }[]): void {
    if (!this.isActive) {
      throw new Error('Transaction not started');
    }
    
    const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
    for (const entity of entities) {
      this.operations.push({
        type: 'save',
        key: entity.key,
        data: entity.data,
      });
    }
  }

  delete(keys: Key | Key[]): void {
    if (!this.isActive) {
      throw new Error('Transaction not started');
    }
    
    const keyArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keyArray) {
      this.operations.push({
        type: 'delete',
        key,
      });
    }
  }

  async commit(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Transaction not started');
    }

    // Apply all operations atomically
    for (const op of this.operations) {
      if (op.type === 'save') {
        await this.datastore.save({ key: op.key, data: op.data });
      } else if (op.type === 'delete') {
        await this.datastore.delete(op.key);
      }
    }

    this.isActive = false;
    this.operations = [];
  }

  async rollback(): Promise<void> {
    if (!this.isActive) {
      throw new Error('Transaction not started');
    }

    this.isActive = false;
    this.operations = [];
  }
}

export { FakeQuery, FakeTransaction };