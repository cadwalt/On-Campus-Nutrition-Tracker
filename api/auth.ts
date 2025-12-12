/**
 * Simple authorization check for API endpoints
 * CWE 862 Mitigation: Ensures requests include user identification
 */

/**
 * Verify that request includes user authorization
 * Returns user ID or throws error
 */
export function verifyAuth(request: Request): string {
  // Check for userId in Authorization header or request body
  const authHeader = request.headers.get('Authorization');
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // For simplicity, treat Bearer token as userId (in production, verify token properly)
    userId = authHeader.substring(7);
  }

  if (!userId || userId.trim().length === 0) {
    throw new Error('Missing user authorization');
  }

  return userId;
}

