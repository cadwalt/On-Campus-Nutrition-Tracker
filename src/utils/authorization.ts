/**
 * Check if user owns a meal
 */
export function canAccess(userId: string, entryUserId: string): boolean {
  return userId === entryUserId;
}
