/**
 * LexoRank Implementation for Message and A/B Pair Ordering
 * 
 * LexoRank is a string-based ranking system that allows efficient reordering
 * without requiring renumbering of all items. It uses base-36 strings to
 * create lexicographically sortable ranks.
 */

// Base-36 character set for rank generation
const BASE36_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
const BASE = 36;

// Default spacing for initial ranks
const INITIAL_RANK_GAP = 34; // This gives us good spacing ('h', 'n', 't', etc.)

/**
 * Converts a number to base-36 string
 */
function numberToBase36(num: number): string {
  if (num === 0) return '0';
  
  let result = '';
  while (num > 0) {
    result = BASE36_CHARS[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  return result;
}

/**
 * Converts a base-36 string to number
 */
function base36ToNumber(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const charIndex = BASE36_CHARS.indexOf(str[i]);
    if (charIndex === -1) throw new Error(`Invalid base-36 character: ${str[i]}`);
    result = result * BASE + charIndex;
  }
  return result;
}

/**
 * Normalizes rank strings to the same length for comparison
 */
function normalizeRanks(rank1: string, rank2: string): [string, string] {
  const maxLength = Math.max(rank1.length, rank2.length);
  const normalized1 = rank1.padEnd(maxLength, '0');
  const normalized2 = rank2.padEnd(maxLength, '0');
  return [normalized1, normalized2];
}

/**
 * Finds the lexicographic midpoint between two base-36 strings
 */
function findMidpoint(before: string, after: string): string {
  if (before >= after) {
    throw new Error('Before rank must be less than after rank');
  }
  
  const [norm1, norm2] = normalizeRanks(before, after);
  
  // Convert to numbers for arithmetic
  const num1 = base36ToNumber(norm1);
  const num2 = base36ToNumber(norm2);
  
  // If there's no space for a midpoint, we need to extend the string
  if (num2 - num1 <= 1) {
    // Extend the shorter string and try again
    const longer = Math.max(before.length, after.length) + 1;
    return findMidpoint(before.padEnd(longer, '0'), after.padEnd(longer, '0'));
  }
  
  // Find the midpoint
  const midpoint = Math.floor((num1 + num2) / 2);
  return numberToBase36(midpoint);
}

/**
 * Generates an initial rank for the first item
 */
export function generateInitialRank(): string {
  return numberToBase36(INITIAL_RANK_GAP); // 'y' in base-36
}

/**
 * Generates evenly spaced initial ranks for multiple items
 */
export function generateInitialRanks(count: number): string[] {
  if (count <= 0) return [];
  
  const ranks: string[] = [];
  const step = Math.floor(BASE36_CHARS.length / (count + 1));
  
  for (let i = 1; i <= count; i++) {
    ranks.push(numberToBase36(i * step));
  }
  
  return ranks;
}

/**
 * Generates a rank between two existing ranks
 */
export function generateRankBetween(beforeRank?: string, afterRank?: string): string {
  // Case 1: No existing ranks - generate initial rank
  if (!beforeRank && !afterRank) {
    return generateInitialRank();
  }
  
  // Case 2: Insert at the beginning
  if (!beforeRank && afterRank) {
    const afterNum = base36ToNumber(afterRank);
    if (afterNum <= 1) {
      // Need to create space before the smallest rank
      return '0' + afterRank;
    }
    const newNum = Math.floor(afterNum / 2);
    return numberToBase36(newNum);
  }
  
  // Case 3: Insert at the end
  if (beforeRank && !afterRank) {
    const beforeNum = base36ToNumber(beforeRank);
    const newNum = beforeNum + INITIAL_RANK_GAP;
    return numberToBase36(newNum);
  }
  
  // Case 4: Insert between two ranks
  if (beforeRank && afterRank) {
    return findMidpoint(beforeRank, afterRank);
  }
  
  throw new Error('Invalid rank parameters');
}

/**
 * Checks if a rank rebalance is needed
 */
export function needsRebalance(ranks: string[]): boolean {
  if (ranks.length < 2) return false;
  
  // Sort ranks to check consecutive pairs
  const sortedRanks = [...ranks].sort();
  
  for (let i = 0; i < sortedRanks.length - 1; i++) {
    const current = sortedRanks[i];
    const next = sortedRanks[i + 1];
    
    try {
      // Try to generate a rank between them
      generateRankBetween(current, next);
    } catch (error) {
      // If we can't generate a midpoint, rebalance is needed
      return true;
    }
  }
  
  return false;
}

/**
 * Rebalances all ranks in a list to create even spacing
 */
export function rebalanceRanks(currentRanks: string[]): Map<string, string> {
  if (currentRanks.length === 0) return new Map();
  
  const sortedRanks = [...currentRanks].sort();
  const newRanks = generateInitialRanks(sortedRanks.length);
  
  const rankMap = new Map<string, string>();
  for (let i = 0; i < sortedRanks.length; i++) {
    rankMap.set(sortedRanks[i], newRanks[i]);
  }
  
  return rankMap;
}

/**
 * Validates that a rank string is valid base-36
 */
export function isValidRank(rank: string): boolean {
  if (!rank || rank.length === 0) return false;
  
  for (const char of rank) {
    if (!BASE36_CHARS.includes(char)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Compares two ranks lexicographically
 */
export function compareRanks(rank1: string, rank2: string): number {
  const [norm1, norm2] = normalizeRanks(rank1, rank2);
  
  if (norm1 < norm2) return -1;
  if (norm1 > norm2) return 1;
  return 0;
}

/**
 * Calculates the optimal position for inserting an item in a sorted list
 */
export function calculateInsertPosition(
  existingRanks: string[],
  beforeId?: string,
  afterId?: string
): string {
  if (existingRanks.length === 0) {
    return generateInitialRank();
  }
  
  const sortedRanks = [...existingRanks].sort();
  
  // If specific position constraints are given
  if (beforeId || afterId) {
    const beforeIndex = beforeId ? sortedRanks.indexOf(beforeId) : -1;
    const afterIndex = afterId ? sortedRanks.indexOf(afterId) : -1;
    
    let beforeRank: string | undefined;
    let afterRank: string | undefined;
    
    if (beforeIndex >= 0) {
      beforeRank = sortedRanks[beforeIndex];
      // If no afterId specified, use the next rank in the array
      if (!afterId && beforeIndex < sortedRanks.length - 1) {
        afterRank = sortedRanks[beforeIndex + 1];
      }
    }
    
    if (afterIndex >= 0) {
      afterRank = sortedRanks[afterIndex];
      // If no beforeId specified, use the previous rank in the array
      if (!beforeId && afterIndex > 0) {
        beforeRank = sortedRanks[afterIndex - 1];
      }
    }
    
    return generateRankBetween(beforeRank, afterRank);
  }
  
  // Default: insert at the end
  return generateRankBetween(sortedRanks[sortedRanks.length - 1]);
}

/**
 * Utility class for managing LexoRank operations
 */
export class LexoRankManager {
  private ranks: Set<string> = new Set();
  
  constructor(initialRanks: string[] = []) {
    this.ranks = new Set(initialRanks.filter(isValidRank));
  }
  
  /**
   * Adds a new rank to the manager
   */
  addRank(rank: string): void {
    if (isValidRank(rank)) {
      this.ranks.add(rank);
    }
  }
  
  /**
   * Removes a rank from the manager
   */
  removeRank(rank: string): void {
    this.ranks.delete(rank);
  }
  
  /**
   * Gets all ranks sorted
   */
  getSortedRanks(): string[] {
    return Array.from(this.ranks).sort();
  }
  
  /**
   * Generates a new rank for insertion
   */
  generateNewRank(beforeRank?: string, afterRank?: string): string {
    const newRank = generateRankBetween(beforeRank, afterRank);
    this.ranks.add(newRank);
    return newRank;
  }
  
  /**
   * Checks if rebalancing is needed and performs it if necessary
   */
  rebalanceIfNeeded(): Map<string, string> | null {
    const currentRanks = this.getSortedRanks();
    
    if (!needsRebalance(currentRanks)) {
      return null;
    }
    
    const rebalanceMap = rebalanceRanks(currentRanks);
    
    // Update internal ranks
    this.ranks.clear();
    for (const newRank of Array.from(rebalanceMap.values())) {
      this.ranks.add(newRank);
    }
    
    return rebalanceMap;
  }
  
  /**
   * Gets the rank that would be used for a new insertion
   */
  getInsertionRank(beforeRank?: string, afterRank?: string): string {
    return calculateInsertPosition(this.getSortedRanks(), beforeRank, afterRank);
  }
}