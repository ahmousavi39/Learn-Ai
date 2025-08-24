// Apple Developer Account Configuration
// Configuration now uses environment variables for security
// Make sure to set these in your .env file

export const APPLE_CONFIG = {
  // 1. From App Store Connect - App Information
  bundleId: process.env.EXPO_PUBLIC_APPLE_BUNDLE_ID || 'com.yourcompany.learnai',
  appStoreId: process.env.EXPO_PUBLIC_APPLE_APP_STORE_ID || '',
  
  // 2. From Apple Developer Portal
  teamId: process.env.EXPO_PUBLIC_APPLE_TEAM_ID || '',
  
  // 3. From App Store Connect - In-App Purchases
  products: {
    premiumMonthly: process.env.EXPO_PUBLIC_APPLE_PREMIUM_MONTHLY_PRODUCT_ID || 'com.ahmousavi.learnintel.monthly',
  },
  
  // 4. From App Store Connect - App-Specific Shared Secret (server-side only)
  sharedSecret: process.env.APPLE_SHARED_SECRET || '',
  
  // 5. For App Store Server API (optional but recommended)
  serverAPI: {
    keyId: process.env.APPLE_SERVER_API_KEY_ID || '',
    issuerId: process.env.APPLE_SERVER_API_ISSUER_ID || '',
    privateKeyPath: process.env.APPLE_SERVER_API_PRIVATE_KEY_PATH || '',
  },
  
  // 6. Subscription Group (from App Store Connect)
  subscriptionGroup: process.env.EXPO_PUBLIC_APPLE_SUBSCRIPTION_GROUP || '',
  
  // 7. Environment
  environment: __DEV__ ? 'sandbox' : 'production',
  
  // 8. Receipt validation URLs
  receiptValidationURLs: {
    production: 'https://buy.itunes.apple.com/verifyReceipt',
    sandbox: 'https://sandbox.itunes.apple.com/verifyReceipt',
  },
};

// Sandbox Test Users (for development only)
// These are loaded from environment variables for security
export const SANDBOX_TEST_USERS = [
  {
    email: process.env.APPLE_SANDBOX_TEST_EMAIL_1 || 'test1@example.com',
    password: process.env.APPLE_SANDBOX_TEST_PASSWORD_1 || 'TestPassword123',
    region: 'US',
  },
  {
    email: process.env.APPLE_SANDBOX_TEST_EMAIL_2 || 'test2@example.com',
    password: process.env.APPLE_SANDBOX_TEST_PASSWORD_2 || 'TestPassword456',
    region: 'US',
  },
];

// Product localization (optional)
export const PRODUCT_LOCALIZATIONS = {
  [APPLE_CONFIG.products.premiumMonthly]: {
    'en-US': {
      displayName: 'LearnIntel Premium',
      description: '50 courses per month + premium features',
      price: '$8.99/month'
    },
    'de-DE': {
      displayName: 'LearnIntel Premium',
      description: '50 Kurse pro Monat + Premium-Funktionen',
      price: '€9,99/Monat'
    },
    'en-GB': {
      displayName: 'LearnIntel Premium',
      description: '50 courses per month + premium features',
      price: '€9.99/month'
    },
    'fr-FR': {
      displayName: 'LearnIntel Premium',
      description: '50 cours par mois + fonctionnalités premium',
      price: '€9,99/mois'
    },
    // Add more languages as needed
  },
};

// Validation function to check if all required environment variables are set
export const validateAppleConfig = (): { isValid: boolean; missingVars: string[] } => {
  const requiredVars = [
    'EXPO_PUBLIC_APPLE_BUNDLE_ID',
    'EXPO_PUBLIC_APPLE_APP_STORE_ID',
    'EXPO_PUBLIC_APPLE_TEAM_ID',
    'EXPO_PUBLIC_APPLE_PREMIUM_MONTHLY_PRODUCT_ID',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
};
