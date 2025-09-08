import { useEffect, useRef, useCallback, useState } from 'react';
import { PendingVote, VoteBatchRequest, UserContext, VoteChoiceNumber } from '@/lib/messaging-schemas';
import { v4 as uuidv4 } from 'uuid';

// ========== CONSTANTS ==========

const VOTE_FLUSH_INTERVAL_MS = parseInt(process.env.NEXT_PUBLIC_VOTE_FLUSH_INTERVAL_MS || '3000', 10);
const VOTE_BATCH_MAX = parseInt(process.env.NEXT_PUBLIC_VOTE_BATCH_MAX || '100', 10);
const STORAGE_KEY = 'messaging-vote-buffer';

// ========== TYPES ==========

interface VoteBuffer {
  votes: PendingVote[];
  lastFlushAt?: string;
  userContext?: UserContext;
}

interface VoteBufferStats {
  pendingCount: number;
  lastFlushAt?: Date;
  isOnline: boolean;
  isBuffering: boolean;
}

interface FlushResult {
  success: boolean;
  accepted: number;
  dropped: number;
  error?: string;
}

// ========== STORAGE UTILITIES ==========

class VoteBufferStorage {
  private static getStorageKey(): string {
    return STORAGE_KEY;
  }

  static load(): VoteBuffer {
    if (typeof window === 'undefined') {
      return { votes: [] };
    }

    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (!stored) {
        return { votes: [] };
      }

      const parsed = JSON.parse(stored) as VoteBuffer;
      return {
        votes: parsed.votes || [],
        lastFlushAt: parsed.lastFlushAt,
        userContext: parsed.userContext,
      };
    } catch (error) {
      console.error('Error loading vote buffer from localStorage:', error);
      return { votes: [] };
    }
  }

  static save(buffer: VoteBuffer): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(buffer));
    } catch (error) {
      console.error('Error saving vote buffer to localStorage:', error);
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(this.getStorageKey());
    } catch (error) {
      console.error('Error clearing vote buffer from localStorage:', error);
    }
  }
}

// ========== VOTE BUFFER MANAGER ==========

class VoteBufferManager {
  private buffer: VoteBuffer;
  private flushTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // Base delay in ms

  constructor() {
    this.buffer = VoteBufferStorage.load();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Online/offline detection
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    this.isOnline = navigator.onLine;
  }

  private handleOnline(): void {
    console.log('Network connection restored');
    this.isOnline = true;
    this.retryCount = 0;
    
    // Flush any pending votes
    if (this.buffer.votes.length > 0) {
      this.scheduleFlush(100); // Quick flush when coming online
    }
  }

  private handleOffline(): void {
    console.log('Network connection lost');
    this.isOnline = false;
    this.clearFlushTimer();
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page becoming hidden - flush immediately
      this.flushNow();
    }
  }

  private handleBeforeUnload(): void {
    // Synchronous flush before page unload
    this.flushSync();
  }

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private scheduleFlush(delay: number = VOTE_FLUSH_INTERVAL_MS): void {
    this.clearFlushTimer();
    
    this.flushTimer = setTimeout(() => {
      this.flushNow();
    }, delay);
  }

  public addVote(messageId: string, choice: VoteChoiceNumber, userContext?: UserContext): void {
    const vote: PendingVote = {
      messageId,
      choice,
      votedAtClient: new Date().toISOString(),
    };

    this.buffer.votes.push(vote);
    
    // Update user context if provided
    if (userContext) {
      this.buffer.userContext = { ...this.buffer.userContext, ...userContext };
    }

    // Save to localStorage
    VoteBufferStorage.save(this.buffer);

    // Schedule flush if we hit the batch limit or if timer isn't running
    if (this.buffer.votes.length >= VOTE_BATCH_MAX) {
      this.flushNow();
    } else if (!this.flushTimer) {
      this.scheduleFlush();
    }
  }

  public async flushNow(): Promise<FlushResult> {
    if (this.buffer.votes.length === 0) {
      return { success: true, accepted: 0, dropped: 0 };
    }

    if (!this.isOnline) {
      console.log('Cannot flush votes while offline');
      return { success: false, accepted: 0, dropped: 0, error: 'Offline' };
    }

    const votesToFlush = [...this.buffer.votes];
    const batchRequest: VoteBatchRequest = {
      votes: votesToFlush,
      userContext: this.buffer.userContext,
      idempotencyKey: uuidv4(),
    };

    try {
      const response = await fetch('/api/messages/vote-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Clear the votes that were successfully processed
      this.buffer.votes = [];
      this.buffer.lastFlushAt = new Date().toISOString();
      this.retryCount = 0;
      
      VoteBufferStorage.save(this.buffer);
      this.clearFlushTimer();

      console.log(`Vote batch flushed: ${result.accepted} accepted, ${result.dropped} dropped`);
      
      return {
        success: true,
        accepted: result.accepted || 0,
        dropped: result.dropped || 0,
      };
    } catch (error) {
      console.error('Error flushing vote batch:', error);
      
      // Implement exponential backoff retry
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
        
        console.log(`Retrying vote flush in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
        this.scheduleFlush(delay);
      } else {
        console.error('Max retry attempts reached for vote flush');
        this.retryCount = 0;
      }

      return {
        success: false,
        accepted: 0,
        dropped: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private flushSync(): void {
    // Synchronous flush using sendBeacon if available
    if (this.buffer.votes.length === 0 || !this.isOnline) {
      return;
    }

    const batchRequest: VoteBatchRequest = {
      votes: this.buffer.votes,
      userContext: this.buffer.userContext,
      idempotencyKey: uuidv4(),
    };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(batchRequest)], {
          type: 'application/json',
        });
        
        const sent = navigator.sendBeacon('/api/messages/vote-batch', blob);
        
        if (sent) {
          // Clear votes optimistically
          this.buffer.votes = [];
          VoteBufferStorage.save(this.buffer);
        }
      }
    } catch (error) {
      console.error('Error in synchronous vote flush:', error);
    }
  }

  public getStats(): VoteBufferStats {
    return {
      pendingCount: this.buffer.votes.length,
      lastFlushAt: this.buffer.lastFlushAt ? new Date(this.buffer.lastFlushAt) : undefined,
      isOnline: this.isOnline,
      isBuffering: this.flushTimer !== null,
    };
  }

  public clearBuffer(): void {
    this.buffer.votes = [];
    this.clearFlushTimer();
    VoteBufferStorage.clear();
  }
}

// ========== REACT HOOK ==========

let globalVoteBuffer: VoteBufferManager | null = null;

export function useVoteBuffer() {
  const [stats, setStats] = useState<VoteBufferStats>({
    pendingCount: 0,
    isOnline: true,
    isBuffering: false,
  });
  
  const voteBufferRef = useRef<VoteBufferManager | null>(null);
  const updateStatsRef = useRef<() => void>();

  // Initialize vote buffer
  useEffect(() => {
    if (!globalVoteBuffer) {
      globalVoteBuffer = new VoteBufferManager();
    }
    voteBufferRef.current = globalVoteBuffer;
    
    // Update stats function
    updateStatsRef.current = () => {
      if (voteBufferRef.current) {
        setStats(voteBufferRef.current.getStats());
      }
    };
    
    // Initial stats update
    updateStatsRef.current();
    
    // Periodic stats updates
    const interval = setInterval(updateStatsRef.current, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const addVote = useCallback((messageId: string, choice: VoteChoiceNumber, userContext?: UserContext) => {
    if (voteBufferRef.current) {
      voteBufferRef.current.addVote(messageId, choice, userContext);
      updateStatsRef.current?.();
    }
  }, []);

  const flushNow = useCallback(async (): Promise<FlushResult> => {
    if (voteBufferRef.current) {
      const result = await voteBufferRef.current.flushNow();
      updateStatsRef.current?.();
      return result;
    }
    return { success: false, accepted: 0, dropped: 0, error: 'Buffer not initialized' };
  }, []);

  const clearBuffer = useCallback(() => {
    if (voteBufferRef.current) {
      voteBufferRef.current.clearBuffer();
      updateStatsRef.current?.();
    }
  }, []);

  return {
    addVote,
    flushNow,
    clearBuffer,
    stats,
  };
}

// ========== STANDALONE UTILITIES ==========

/**
 * Add a vote to the buffer (for use outside of React components)
 */
export function addVoteToBuffer(messageId: string, choice: VoteChoiceNumber, userContext?: UserContext): void {
  if (!globalVoteBuffer) {
    globalVoteBuffer = new VoteBufferManager();
  }
  globalVoteBuffer.addVote(messageId, choice, userContext);
}

/**
 * Flush votes immediately (for use outside of React components)
 */
export async function flushVotesNow(): Promise<FlushResult> {
  if (!globalVoteBuffer) {
    globalVoteBuffer = new VoteBufferManager();
  }
  return await globalVoteBuffer.flushNow();
}

/**
 * Get current buffer stats (for use outside of React components)
 */
export function getVoteBufferStats(): VoteBufferStats {
  if (!globalVoteBuffer) {
    return {
      pendingCount: 0,
      isOnline: true,
      isBuffering: false,
    };
  }
  return globalVoteBuffer.getStats();
}