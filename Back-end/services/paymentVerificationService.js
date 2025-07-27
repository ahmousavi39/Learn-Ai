const { auth } = require('../config/firebase');
const courseCountService = require('./courseCountService');

class PaymentVerificationService {
  
  /**
   * Verify App Store receipt (iOS)
   */
  async verifyAppleReceipt(receiptData, isProduction = false) {
    try {
      const url = isProduction 
        ? 'https://buy.itunes.apple.com/verifyReceipt'
        : 'https://sandbox.itunes.apple.com/verifyReceipt';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'receipt-data': receiptData,
          'password': process.env.APPLE_SHARED_SECRET, // Your App Store shared secret
        }),
      });

      const result = await response.json();
      
      if (result.status === 0) {
        // Receipt is valid
        const latestReceipt = result.latest_receipt_info?.[0] || result.receipt?.in_app?.[0];
        
        if (latestReceipt) {
          return {
            valid: true,
            transactionId: latestReceipt.transaction_id,
            productId: latestReceipt.product_id,
            purchaseDate: new Date(parseInt(latestReceipt.purchase_date_ms)),
            expiryDate: latestReceipt.expires_date_ms ? new Date(parseInt(latestReceipt.expires_date_ms)) : null,
            originalTransactionId: latestReceipt.original_transaction_id,
          };
        }
      }

      console.error('❌ Apple receipt verification failed:', result);
      return { valid: false, error: 'Invalid receipt' };

    } catch (error) {
      console.error('❌ Apple receipt verification error:', error);
      return { valid: false, error: 'Verification failed' };
    }
  }

  /**
   * Verify Google Play purchase
   */
  async verifyGooglePurchase(packageName, productId, purchaseToken) {
    try {
      // Note: You'll need to implement Google Play Developer API authentication
      // This is a simplified version - you'll need proper OAuth2 setup
      
      const { google } = require('googleapis');
      
      // Initialize Google Play Developer API
      const androidpublisher = google.androidpublisher('v3');
      
      // You'll need to set up service account authentication
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      const authClient = await auth.getClient();
      google.options({ auth: authClient });

      const result = await androidpublisher.purchases.products.get({
        packageName: packageName,
        productId: productId,
        token: purchaseToken,
      });

      if (result.data.purchaseState === 0) { // 0 = purchased
        return {
          valid: true,
          transactionId: result.data.orderId,
          productId: productId,
          purchaseDate: new Date(parseInt(result.data.purchaseTimeMillis)),
          acknowledged: result.data.acknowledgementState === 1,
        };
      }

      return { valid: false, error: 'Purchase not valid' };

    } catch (error) {
      console.error('❌ Google Play verification error:', error);
      return { valid: false, error: 'Verification failed' };
    }
  }

  /**
   * Create premium Firebase account after payment verification
   */
  async createPremiumAccount(email, password, paymentVerification) {
    try {
      console.log('🔐 Creating premium Firebase account for:', email);

      // Create Firebase user
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        emailVerified: false, // Will be verified through email
        disabled: false,
      });

      console.log('✅ Firebase user created:', userRecord.uid);

      // Set custom claims for premium user
      await auth.setCustomUserClaims(userRecord.uid, {
        premium: true,
        subscriptionActive: true,
        paymentVerified: true,
        transactionId: paymentVerification.transactionId,
        productId: paymentVerification.productId,
        purchaseDate: paymentVerification.purchaseDate.toISOString(),
      });

      // Add to course count tracking with email as identifier
      const limitCheck = await courseCountService.canGenerateCourse(email, 'premium');
      
      console.log('✅ Premium user added to course tracking:', email);

      // Send email verification
      const emailLink = await auth.generateEmailVerificationLink(email);
      
      return {
        success: true,
        user: {
          uid: userRecord.uid,
          email: email,
          emailVerified: false,
          premium: true,
          emailVerificationLink: emailLink,
        },
        courseTracking: limitCheck,
      };

    } catch (error) {
      console.error('❌ Failed to create premium account:', error);
      
      // Clean up if account creation failed
      try {
        if (error.user?.uid) {
          await auth.deleteUser(error.user.uid);
        }
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup partial account:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Verify existing Firebase user credentials
   */
  async verifyUserLogin(email, idToken) {
    try {
      console.log('🔍 Verifying user login for:', email);

      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      
      if (decodedToken.email !== email) {
        throw new Error('Email mismatch in token');
      }

      // Get user record to check claims
      const userRecord = await auth.getUser(decodedToken.uid);
      
      // Check if user exists in course tracking
      const userInTracking = await courseCountService.getCourseCount(email);
      
      if (userInTracking.count === 0 && !userInTracking.firstCourse) {
        // User not in tracking yet, add them
        await courseCountService.canGenerateCourse(email, 'premium');
        console.log('✅ Added existing user to course tracking:', email);
      }

      return {
        valid: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          premium: userRecord.customClaims?.premium || false,
          subscriptionActive: userRecord.customClaims?.subscriptionActive || false,
          disabled: userRecord.disabled,
        },
        courseStatus: userInTracking,
      };

    } catch (error) {
      console.error('❌ User login verification failed:', error);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if user has active premium subscription
   */
  async checkSubscriptionStatus(uid) {
    try {
      const userRecord = await auth.getUser(uid);
      const claims = userRecord.customClaims || {};
      
      return {
        isPremium: claims.premium === true,
        isActive: claims.subscriptionActive === true,
        paymentVerified: claims.paymentVerified === true,
        transactionId: claims.transactionId,
        purchaseDate: claims.purchaseDate,
      };

    } catch (error) {
      console.error('❌ Failed to check subscription status:', error);
      return {
        isPremium: false,
        isActive: false,
        paymentVerified: false,
      };
    }
  }

  /**
   * Update subscription status (for renewals, cancellations)
   */
  async updateSubscriptionStatus(uid, status) {
    try {
      const userRecord = await auth.getUser(uid);
      const currentClaims = userRecord.customClaims || {};
      
      await auth.setCustomUserClaims(uid, {
        ...currentClaims,
        subscriptionActive: status.active,
        lastUpdated: new Date().toISOString(),
        ...status,
      });

      console.log('✅ Subscription status updated for:', uid);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to update subscription status:', error);
      throw error;
    }
  }
}

module.exports = new PaymentVerificationService();
