// @ts-nocheck
/**
 * Admin authorization helpers for role-based access control
 */

/**
 * Check if user has admin access (admin, moderator, or owner)
 * @param {Object} user - User object from session
 * @returns {boolean}
 */
export function canAccessAdmin(user) {
  if (!user) return false;
  const role = user.role || "user";
  return role === "admin" || role === "owner" || role === "moderator";
}

/**
 * Check if user is owner
 * @param {Object} user - User object from session
 * @returns {boolean}
 */
export function isOwner(user) {
  if (!user) return false;
  const role = user.role || "user";
  return role === "owner";
}

/**
 * Check if user is admin or owner
 * @param {Object} user - User object from session
 * @returns {boolean}
 */
export function isAdminOrOwner(user) {
  if (!user) return false;
  const role = user.role || "user";
  return role === "admin" || role === "owner";
}

/**
 * Validate admin access and return 403 response if unauthorized
 * @param {Object} user - User object from session
 * @returns {Response|null} - Returns Response with 403 if unauthorized, null if authorized
 */
export function requireAdminAccess(user) {
  if (!canAccessAdmin(user)) {
    return Response.json(
      { error: "Access denied. Admin privileges required." },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Validate owner access and return 403 response if unauthorized
 * @param {Object} user - User object from session
 * @returns {Response|null} - Returns Response with 403 if unauthorized, null if authorized
 */
export function requireOwnerAccess(user) {
  if (!isOwner(user)) {
    return Response.json(
      { error: "Access denied. Owner privileges required." },
      { status: 403 },
    );
  }
  return null;
}
