/**
 * Hyperscale Distributed Cache Strategy
 * Centralizes cache key generation and invalidation rules for stateless architecture.
 */

export const CacheKeys = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_PERMISSIONS: (userId: string) => `user:permissions:${userId}`,
  COURSE_DETAILS: (courseId: string) => `course:details:${courseId}`,
  PLATFORM_SETTINGS: (platformId: string) => `platform:settings:${platformId}`,
  LIBRARY_ITEMS: (userId: string) => `library:items:${userId}`,
};

export const CacheTTL = {
  SHORT: 60 * 5,       // 5 Minutes
  MEDIUM: 60 * 60,     // 1 Hour
  LONG: 60 * 60 * 24,  // 24 Hours
};

export class CacheInvalidationRules {
  static onUserUpdate(userId: string): string[] {
    return [
      CacheKeys.USER_PROFILE(userId),
      CacheKeys.USER_PERMISSIONS(userId)
    ];
  }

  static onCourseUpdate(courseId: string): string[] {
    return [
      CacheKeys.COURSE_DETAILS(courseId)
    ];
  }

  static onPurchaseComplete(userId: string): string[] {
    return [
      CacheKeys.LIBRARY_ITEMS(userId),
      CacheKeys.USER_PERMISSIONS(userId)
    ];
  }
}
