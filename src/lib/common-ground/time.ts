import { createHash } from 'crypto';

// Returns the current time in ISO 8601 format.
export function nowIso(): string {
  return new Date().toISOString();
}

// Generates an ETag from a JavaScript object.
export function etagFrom(obj: any): string {
  const jsonString = JSON.stringify(obj);
  return createHash('sha1').update(jsonString).digest('hex');
}