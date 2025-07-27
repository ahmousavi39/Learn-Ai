import { Platform } from 'react-native';

// Mock implementation - replace with actual payment SDK
// For iOS: react-native-iap or expo-in-app-purchases
// For Android: react-native-iap or Google Play Billing

export interface PaymentResult {
  success: boolean;
  receipt?: string;
  transactionId?: string;
  productId?: string;
  error?: string;
  platform: 'ios' | 'android';
}

export interface PremiumAccountData {
  email: string;
  password: string;
  receipt: PaymentResult;
}

class PaymentService {
  private static instance: PaymentService;
  private readonly BACKEND_URL = 'http://192.168.1.100:3000'; // Update with your backend URL
  private readonly PREMIUM_PRODUCT_ID = 'premium_subscription_monthly';

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Step 1: Initiate payment process
   */
  async purchasePremiumSubscription(): Promise<PaymentResult> {
    try {
      console.log('🛒 Starting premium subscription purchase...');

      if (Platform.OS === 'ios') {
        return await this.purchaseIOS();
      } else if (Platform.OS === 'android') {
        return await this.purchaseAndroid();
      } else {
        return {
          success: false,
          error: 'Platform not supported',
          platform: 'ios' // fallback
        };
      }

    } catch (error) {
      console.error('❌ Payment failed:', error);
      return {
        success: false,
        error: error.message || 'Payment failed',
        platform: Platform.OS as 'ios' | 'android'
      };
    }
  }

  /**
   * iOS App Store purchase
   */
  private async purchaseIOS(): Promise<PaymentResult> {
    try {
      // Mock implementation - replace with react-native-iap
      console.log('🍎 Processing iOS App Store purchase...');
      
      // This is where you'd integrate with react-native-iap:
      /*
      import { purchaseUpdatedListener, purchaseErrorListener, type ProductPurchase, type PurchaseError, initConnection, endConnection, requestPurchase, finishTransaction } from 'react-native-iap';
      
      await initConnection();
      
      const purchase = await requestPurchase({
        sku: this.PREMIUM_PRODUCT_ID,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });
      
      await finishTransaction({ purchase });
      */

      // Mock success response
      const mockReceipt = {
        success: true,
        receipt: 'mock_ios_receipt_data_base64_encoded',
        transactionId: 'ios_' + Date.now(),
        productId: this.PREMIUM_PRODUCT_ID,
        platform: 'ios' as const
      };

      console.log('✅ iOS payment successful:', mockReceipt.transactionId);
      return mockReceipt;

    } catch (error) {
      console.error('❌ iOS payment failed:', error);
      return {
        success: false,
        error: 'iOS payment failed: ' + error.message,
        platform: 'ios'
      };
    }
  }

  /**
   * Android Google Play purchase
   */
  private async purchaseAndroid(): Promise<PaymentResult> {
    try {
      // Mock implementation - replace with react-native-iap
      console.log('🤖 Processing Android Google Play purchase...');
      
      // This is where you'd integrate with react-native-iap:
      /*
      import { purchaseUpdatedListener, purchaseErrorListener, type ProductPurchase, type PurchaseError, initConnection, endConnection, requestPurchase, finishTransaction } from 'react-native-iap';
      
      await initConnection();
      
      const purchase = await requestPurchase({
        sku: this.PREMIUM_PRODUCT_ID,
      });
      
      await finishTransaction({ purchase });
      */

      // Mock success response
      const mockReceipt = {
        success: true,
        receipt: JSON.stringify({
          packageName: 'com.yourcompany.learnai',
          productId: this.PREMIUM_PRODUCT_ID,
          purchaseToken: 'mock_android_purchase_token_' + Date.now()
        }),
        transactionId: 'android_' + Date.now(),
        productId: this.PREMIUM_PRODUCT_ID,
        platform: 'android' as const
      };

      console.log('✅ Android payment successful:', mockReceipt.transactionId);
      return mockReceipt;

    } catch (error) {
      console.error('❌ Android payment failed:', error);
      return {
        success: false,
        error: 'Android payment failed: ' + error.message,
        platform: 'android'
      };
    }
  }

  /**
   * Step 2: Create premium account after successful payment
   */
  async createPremiumAccount(accountData: PremiumAccountData): Promise<{
    success: boolean;
    user?: any;
    courseStatus?: any;
    error?: string;
    message?: string;
  }> {
    try {
      console.log('🔐 Creating premium account for:', accountData.email);

      const response = await fetch(`${this.BACKEND_URL}/api/auth/create-premium-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: accountData.email,
          password: accountData.password,
          receipt: accountData.receipt.receipt,
          platform: accountData.receipt.platform,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Account creation failed:', result);
        return {
          success: false,
          error: result.error || 'Account creation failed',
          message: result.message
        };
      }

      console.log('✅ Premium account created successfully');
      return {
        success: true,
        user: result.user,
        courseStatus: result.courseStatus,
        message: result.message
      };

    } catch (error) {
      console.error('❌ Network error during account creation:', error);
      return {
        success: false,
        error: 'Network error',
        message: 'Unable to connect to server. Please check your internet connection.'
      };
    }
  }

  /**
   * Complete purchase-to-account flow
   */
  async purchaseAndCreateAccount(email: string, password: string): Promise<{
    success: boolean;
    user?: any;
    courseStatus?: any;
    error?: string;
    message?: string;
    step?: string;
  }> {
    try {
      // Step 1: Process payment
      console.log('🛒 Step 1: Processing payment...');
      const paymentResult = await this.purchasePremiumSubscription();

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error,
          message: 'Payment failed. Please try again.',
          step: 'payment'
        };
      }

      // Step 2: Create account with payment proof
      console.log('🔐 Step 2: Creating premium account...');
      const accountResult = await this.createPremiumAccount({
        email,
        password,
        receipt: paymentResult
      });

      if (!accountResult.success) {
        // Payment succeeded but account creation failed
        // In a real app, you'd want to store the receipt for manual processing
        return {
          success: false,
          error: accountResult.error,
          message: 'Payment successful but account creation failed. Please contact support with your receipt.',
          step: 'account_creation'
        };
      }

      return {
        success: true,
        user: accountResult.user,
        courseStatus: accountResult.courseStatus,
        message: 'Premium account created successfully!',
        step: 'complete'
      };

    } catch (error) {
      console.error('❌ Complete flow failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'An unexpected error occurred. Please try again.',
        step: 'unknown'
      };
    }
  }

  /**
   * Sign in with existing premium account
   */
  async signInPremiumAccount(email: string, firebaseToken: string): Promise<{
    success: boolean;
    user?: any;
    courseStatus?: any;
    error?: string;
    message?: string;
  }> {
    try {
      console.log('🔐 Signing in premium account:', email);

      const response = await fetch(`${this.BACKEND_URL}/api/auth/signin-premium`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          idToken: firebaseToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Premium sign in failed:', result);
        return {
          success: false,
          error: result.error || 'Sign in failed',
          message: result.message
        };
      }

      console.log('✅ Premium sign in successful');
      return {
        success: true,
        user: result.user,
        courseStatus: result.courseStatus,
        message: result.message
      };

    } catch (error) {
      console.error('❌ Network error during sign in:', error);
      return {
        success: false,
        error: 'Network error',
        message: 'Unable to connect to server. Please check your internet connection.'
      };
    }
  }

  /**
   * Check subscription status
   */
  async checkSubscriptionStatus(firebaseToken: string): Promise<{
    success: boolean;
    subscription?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/auth/subscription-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to check subscription'
        };
      }

      return {
        success: true,
        subscription: result.subscription
      };

    } catch (error) {
      console.error('❌ Failed to check subscription status:', error);
      return {
        success: false,
        error: 'Network error'
      };
    }
  }

  /**
   * Get available products (for displaying prices)
   */
  async getAvailableProducts(): Promise<{
    success: boolean;
    products?: any[];
    error?: string;
  }> {
    try {
      // This would integrate with react-native-iap to get actual product info
      // For now, return mock data
      return {
        success: true,
        products: [
          {
            productId: this.PREMIUM_PRODUCT_ID,
            title: 'Premium Monthly Subscription',
            description: '50 courses per month + premium features',
            price: Platform.OS === 'ios' ? '$9.99' : '$9.99',
            currency: 'USD'
          }
        ]
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to load products'
      };
    }
  }
}

export default PaymentService;
