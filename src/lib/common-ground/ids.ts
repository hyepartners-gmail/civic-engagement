import { v4 as uuidv4 } from 'uuid';

// Generates a short, random code for joining groups.
export function generateGroupCode(): string {
  // A shorter, more user-friendly code than a full UUID.
  return uuidv4().substring(0, 8).toUpperCase();
}

// Generates a unique code for invites.
export function generateInviteCode(): string {
  return uuidv4();
}