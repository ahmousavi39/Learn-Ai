const { APPLE_CONFIG, validateAppleConfig, validateReceipt, isValidProductId } = require('../config/appleConfig');

class ReceiptVerificationService {
  constructor() {
    // Validate configuration on startup
    const validation = validateAppleConfig();
    if (!validation.isValid) {
      console.warn('⚠️ Apple configuration incomplete:', validation.message);
    } else {
      console.log('✅ Apple configuration validated successfully');
      if (!validation.hasServerAPI) {
        console.log('ℹ️ App Store Server API not configured (optional):', validation.message);
      }
    }
  }

  /**
   * Verify Apple App Store receipt
   */
  async verifyAppleReceipt(receiptData, expectedProductId = null) {
    try {
      console.log('🧾 Starting Apple receipt verification...');
      
      if (!APPLE_CONFIG.sharedSecret) {
        throw new Error('Apple shared secret not configured');
      }

      // Start with production environment, will fall back to sandbox if needed
      const isProduction = APPLE_CONFIG.environment === 'production';
      const result = await validateReceipt(receiptData, isProduction);

      if (!result.success) {
        console.error('❌ Receipt validation failed:', result);
        return {
          success: false,
          error: `Receipt validation failed with status: ${result.status}`,
          status: result.status
        };
      }

      console.log('✅ Receipt validated successfully');

      // Extract subscription information
      const receiptInfo = result.receipt;
      const latestReceiptInfo = result.latest_receipt_info;
      
      if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
        return {
          success: false,
          error: 'No subscription information found in receipt'
        };
      }

      // Get the most recent transaction
      const latestTransaction = latestReceiptInfo[latestReceiptInfo.length - 1];
      
      // Validate product ID if specified
      if (expectedProductId && !isValidProductId(latestTransaction.product_id)) {
        return {
          success: false,
          error: `Invalid product ID: ${latestTransaction.product_id}`
        };
      }

      // Check if subscription is active
      const expirationDate = new Date(parseInt(latestTransaction.expires_date_ms));
      const isActive = expirationDate > new Date();

      return {
        success: true,
        subscription: {
          productId: latestTransaction.product_id,
          transactionId: latestTransaction.transaction_id,
          originalTransactionId: latestTransaction.original_transaction_id,
          purchaseDate: new Date(parseInt(latestTransaction.purchase_date_ms)),
          expirationDate: expirationDate,
          isActive: isActive,
          autoRenewStatus: result.pending_renewal_info?.[0]?.auto_renew_status === '1',
          environment: result.environment
        },
        receipt: receiptInfo,
        rawResponse: result
      };

    } catch (error) {
      console.error('❌ Apple receipt verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a subscription is still valid
   */
  async checkSubscriptionStatus(originalTransactionId) {
    try {
      // This would use App Store Server API if configured
      // For now, we'll return a basic response
      console.log('🔍 Checking subscription status for:', originalTransactionId);
      
      // TODO: Implement App Store Server API call
      // This requires the App Store Server API private key
      
      return {
        success: true,
        message: 'Subscription status check requires App Store Server API configuration'
      };
      
    } catch (error) {
      console.error('❌ Subscription status check error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process webhook notifications from Apple
   */
  async processAppleWebhook(notificationPayload) {
    try {
      console.log('📬 Processing Apple webhook notification...');
      
      // TODO: Implement webhook processing
      // This would handle subscription renewals, cancellations, etc.
      
      return {
        success: true,
        message: 'Webhook processing not yet implemented'
      };
      
    } catch (error) {
      console.error('❌ Apple webhook processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus() {
    return validateAppleConfig();
  }
}

module.exports = new ReceiptVerificationService();
