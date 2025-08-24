const { AppStoreServerAPIClient, Environment, ReceiptUtility } = require('app-store-server-api');
const { google } = require('googleapis');

// Apple App Store Receipt Verification
const verifyAppleReceipt = async (receiptData) => {
  try {
    // Special handling for development/mock receipts
    if (receiptData && receiptData.startsWith('sandbox-receipt-')) {
      console.log('🧪 Processing mock sandbox receipt for development:', receiptData);
      
      // Return a valid mock response for development
      return {
        isValid: true,
        purchaseData: {
          originalTransactionId: receiptData.replace('sandbox-receipt-', 'mock-original-'),
          transactionId: receiptData.replace('sandbox-receipt-', 'mock-txn-'),
          productId: process.env.EXPO_PUBLIC_APPLE_PREMIUM_MONTHLY_PRODUCT_ID || 'com.ahmousavi.learnintel.monthly',
          purchaseTime: new Date().toISOString(),
          expiryTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          subscriptionId: `mock-sub-${Date.now()}`,
          isMockPurchase: true
        }
      };
    }

    // Check if Apple credentials are configured
    const issuerId = process.env.APPLE_ISSUER_ID;
    const keyId = process.env.APPLE_KEY_ID;
    const bundleId = process.env.APPLE_BUNDLE_ID;
    const privateKey = process.env.APPLE_PRIVATE_KEY;

    if (!issuerId || !keyId || !bundleId || !privateKey) {
      console.warn('⚠️  Apple App Store credentials not configured');
      return { 
        isValid: false, 
        error: 'Apple App Store verification not configured. Please add your Apple credentials to the .env file.' 
      };
    }

    // Only import and use the Apple SDK if credentials are available
    const { AppStoreServerAPIClient, Environment, ReceiptUtility } = require('app-store-server-api');
    
    // For production, use Environment.PRODUCTION
    const environment = process.env.NODE_ENV === 'production' ? Environment.PRODUCTION : Environment.SANDBOX;

    const client = new AppStoreServerAPIClient(
      privateKey.replace(/\\n/g, '\n'),
      keyId,
      issuerId,
      bundleId,
      environment
    );

    // Decode and verify the receipt
    const decodedReceipt = ReceiptUtility.extractTransactionIdFromAppReceipt(receiptData);
    
    if (!decodedReceipt) {
      return { isValid: false, error: 'Invalid receipt format' };
    }

    // Get transaction info
    const transactionInfo = await client.getTransactionInfo(decodedReceipt);
    
    if (transactionInfo && transactionInfo.signedTransactionInfo) {
      const transaction = ReceiptUtility.extractTransactionInfoFromJWS(
        transactionInfo.signedTransactionInfo
      );

      // Check if transaction is valid and not expired
      const now = Date.now();
      const isValid = transaction.expiresDate ? transaction.expiresDate > now : true;

      return {
        isValid,
        purchaseData: {
          originalTransactionId: transaction.originalTransactionId,
          transactionId: transaction.transactionId,
          productId: transaction.productId,
          purchaseTime: new Date(transaction.purchaseDate).toISOString(),
          expiryTime: transaction.expiresDate ? new Date(transaction.expiresDate).toISOString() : null,
          subscriptionId: transaction.webOrderLineItemId
        }
      };
    }

    return { isValid: false, error: 'Transaction not found' };

  } catch (error) {
    console.error('Apple receipt verification error:', error);
    return { isValid: false, error: error.message };
  }
};

// Alternative simple Apple receipt verification (using legacy endpoint)
const verifyAppleReceiptLegacy = async (receiptData) => {
  try {
    const sharedSecret = process.env.APPLE_SHARED_SECRET;
    
    if (!sharedSecret) {
      console.warn('⚠️  Apple shared secret not configured');
      return { 
        isValid: false, 
        error: 'Apple shared secret not configured. Please add APPLE_SHARED_SECRET to your .env file.' 
      };
    }

    const receiptUrl = process.env.NODE_ENV === 'production' 
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt';

    const response = await fetch(receiptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'receipt-data': receiptData,
        'password': sharedSecret,
        'exclude-old-transactions': true
      })
    });

    const result = await response.json();

    if (result.status === 0 && result.receipt) {
      const latestReceipt = result.latest_receipt_info?.[0] || result.receipt.in_app?.[0];
      
      if (latestReceipt) {
        const expiryDate = latestReceipt.expires_date_ms ? 
          new Date(parseInt(latestReceipt.expires_date_ms)) : null;
        const isValid = expiryDate ? expiryDate > new Date() : true;

        return {
          isValid,
          purchaseData: {
            originalTransactionId: latestReceipt.original_transaction_id,
            transactionId: latestReceipt.transaction_id,
            productId: latestReceipt.product_id,
            purchaseTime: new Date(parseInt(latestReceipt.purchase_date_ms)).toISOString(),
            expiryTime: expiryDate ? expiryDate.toISOString() : null
          }
        };
      }
    }

    return { isValid: false, error: `Apple verification failed: ${result.status}` };

  } catch (error) {
    console.error('Apple receipt verification error:', error);
    return { isValid: false, error: error.message };
  }
};

// Google Play Purchase Verification
const verifyGooglePlayPurchase = async (productId, purchaseToken) => {
  try {
    const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!packageName || !serviceAccountKey) {
      console.error('Google Play credentials not configured');
      return { isValid: false, error: 'Google Play credentials not configured' };
    }

    // Create Google Play API client
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountKey),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidpublisher = google.androidpublisher({
      version: 'v3',
      auth: auth,
    });

    // Verify subscription
    const response = await androidpublisher.purchases.subscriptions.get({
      packageName: packageName,
      subscriptionId: productId,
      token: purchaseToken,
    });

    const purchase = response.data;

    if (purchase) {
      const expiryTime = purchase.expiryTimeMillis ? 
        new Date(parseInt(purchase.expiryTimeMillis)) : null;
      const isValid = expiryTime ? expiryTime > new Date() : false;

      return {
        isValid: isValid && purchase.paymentState === 1, // 1 = received
        purchaseData: {
          orderId: purchase.orderId,
          productId: productId,
          purchaseTime: new Date(parseInt(purchase.startTimeMillis)).toISOString(),
          expiryTime: expiryTime ? expiryTime.toISOString() : null,
          autoRenewing: purchase.autoRenewing,
          countryCode: purchase.countryCode,
          paymentState: purchase.paymentState
        }
      };
    }

    return { isValid: false, error: 'Purchase not found' };

  } catch (error) {
    console.error('Google Play verification error:', error);
    return { isValid: false, error: error.message };
  }
};

// Helper function to choose the appropriate verification method
const verifyReceipt = async (platform, receiptData, productId, purchaseToken) => {
  if (platform === 'ios') {
    // Try modern API first, fallback to legacy
    try {
      return await verifyAppleReceipt(receiptData);
    } catch (error) {
      console.log('Falling back to legacy Apple verification');
      return await verifyAppleReceiptLegacy(receiptData);
    }
  } else if (platform === 'android') {
    return await verifyGooglePlayPurchase(productId, purchaseToken);
  } else {
    return { isValid: false, error: 'Unsupported platform' };
  }
};

module.exports = {
  verifyAppleReceipt,
  verifyAppleReceiptLegacy,
  verifyGooglePlayPurchase,
  verifyReceipt
};
