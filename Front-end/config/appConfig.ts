// Application Configuration
// Easy to modify settings for development and production

export const APP_CONFIG = {
  // Course generation limits
  COURSE_LIMITS: {
    // For testing: Set to 100, for production: Set to 2
    FREE_USER_MONTHLY_LIMIT: 100, // Change this to 2 for production
    PREMIUM_USER_MONTHLY_LIMIT: 50,
  },
  
  // Environment settings
  IS_DEVELOPMENT: __DEV__,
  
  // Premium features configuration
  PREMIUM_FEATURES: {
    UNLIMITED_COURSES: false, // Premium users get 50/month, not unlimited
    PRIORITY_SUPPORT: true,
    NO_ADVERTISEMENTS: true,
  },
};

export default APP_CONFIG;
