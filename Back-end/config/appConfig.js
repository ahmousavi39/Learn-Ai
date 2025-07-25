// Backend Configuration
// Easy to modify settings for development and production

const CONFIG = {
  // Course generation limits
  COURSE_LIMITS: {
    // For testing: Set to 100, for production: Set to 2
    FREE_USER_MONTHLY_LIMIT: 100, // Change this to 2 for production
    PREMIUM_USER_MONTHLY_LIMIT: 50,
  },
  
  // Environment settings
  IS_DEVELOPMENT: process.env.NODE_ENV !== 'production',
  
  // Premium features configuration
  PREMIUM_FEATURES: {
    UNLIMITED_COURSES: false, // Premium users get 50/month, not unlimited
    PRIORITY_SUPPORT: true,
    NO_ADVERTISEMENTS: true,
  },
  
  // Firebase configuration
  FIREBASE: {
    ENABLED: !!(process.env.FIREBASE_PROJECT_ID && 
                process.env.FIREBASE_PRIVATE_KEY && 
                process.env.FIREBASE_CLIENT_EMAIL),
  },
};

module.exports = CONFIG;
