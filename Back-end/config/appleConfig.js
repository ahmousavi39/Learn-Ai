// Apple App Store Configuration for Backend
// Uses environment variables for secure configuration

const APPLE_CONFIG = {
  // App Store Server API
  issuerId: process.env.APPLE_ISSUER_ID,
  keyId: process.env.APPLE_KEY_ID,
  privateKey: process.env.APPLE_PRIVATE_KEY,
  
  // App Information
  bundleId: process.env.APPLE_BUNDLE_ID,
  teamId: process.env.APPLE_TEAM_ID,
  
  // Receipt Validation
  sharedSecret: process.env.APPLE_SHARED_SECRET,
  
  // Product IDs
  productIds: {
    premiumMonthly: process.env.APPLE_PREMIUM_MONTHLY_PRODUCT_ID,
  },
  
  // Environment
  environment: process.env.APPLE_ENVIRONMENT || 'sandbox',
  
  // Receipt Validation URLs
  receiptValidationUrls: {
    production: process.env.APPLE_RECEIPT_VALIDATION_URL_PRODUCTION || 'https://buy.itunes.apple.com/verifyReceipt',
    sandbox: process.env.APPLE_RECEIPT_VALIDATION_URL_SANDBOX || 'https://sandbox.itunes.apple.com/verifyReceipt',
  },
  
  // Get the appropriate receipt validation URL based on environment
  getReceiptValidationUrl() {
    return this.environment === 'production' 
      ? this.receiptValidationUrls.production 
      : this.receiptValidationUrls.sandbox;
  }
};

// Validation function to check if all required Apple config is present
const validateAppleConfig = () => {
  const requiredFields = [
    'bundleId',
    'sharedSecret',
  ];
  
  const optionalFields = [
    'issuerId',
    'keyId', 
    'privateKey',
    'teamId'
  ];
  
  const missing = [];
  const warnings = [];
  
  // Check required fields
  for (const field of requiredFields) {
    if (!APPLE_CONFIG[field]) {
      missing.push(field);
    }
  }
  
  // Check optional fields (for App Store Server API)
  for (const field of optionalFields) {
    if (!APPLE_CONFIG[field]) {
      warnings.push(field);
    }
  }
  
  return {
    isValid: missing.length === 0,
    hasServerAPI: warnings.length === 0,
    missing,
    warnings,
    message: missing.length > 0 
      ? `Missing required Apple configuration: ${missing.join(', ')}`
      : warnings.length > 0
      ? `Missing optional Apple Server API configuration: ${warnings.join(', ')}`
      : 'Apple configuration is complete'
  };
};

// Receipt validation helper
const validateReceipt = async (receiptData, isProduction = false) => {
  try {
    const url = isProduction 
      ? APPLE_CONFIG.receiptValidationUrls.production 
      : APPLE_CONFIG.receiptValidationUrls.sandbox;
    
    const requestBody = {
      'receipt-data': receiptData,
      'password': APPLE_CONFIG.sharedSecret,
      'exclude-old-transactions': true
    };
    
    console.log(`🧾 Validating receipt with Apple (${isProduction ? 'production' : 'sandbox'})...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const result = await response.json();
    
    // If sandbox receipt was sent to production, try sandbox
    if (result.status === 21007 && isProduction) {
      console.log('🔄 Receipt is from sandbox, retrying with sandbox URL...');
      return validateReceipt(receiptData, false);
    }
    
    return {
      success: result.status === 0,
      status: result.status,
      receipt: result.receipt,
      latest_receipt_info: result.latest_receipt_info,
      pending_renewal_info: result.pending_renewal_info,
      environment: result.environment || (isProduction ? 'Production' : 'Sandbox')
    };
    
  } catch (error) {
    console.error('❌ Receipt validation error:', error);
    return {
      success: false,
      error: error.message,
      status: -1
    };
  }
};

// Product ID validation helper
const isValidProductId = (productId) => {
  const validProducts = Object.values(APPLE_CONFIG.productIds).filter(Boolean);
  return validProducts.includes(productId);
};

module.exports = {
  APPLE_CONFIG,
  validateAppleConfig,
  validateReceipt,
  isValidProductId
};
