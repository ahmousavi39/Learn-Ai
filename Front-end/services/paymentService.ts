import { Platform } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { APPLE_CONFIG, validateAppleConfig } from '../config/appleConfig';

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
  private readonly PREMIUM_PRODUCT_ID = APPLE_CONFIG.products.premiumMonthly;
  
  // Apple Developer Account Configuration
  private readonly APPLE_CONFIG = APPLE_CONFIG;

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Validate Apple configuration before processing payments
   */
  private validateConfiguration(): { isValid: boolean; error?: string } {
    const validation = validateAppleConfig();
    
    if (!validation.isValid) {
      console.error('❌ Apple configuration validation failed. Missing environment variables:', validation.missingVars);
      return {
        isValid: false,
        error: `Missing Apple configuration: ${validation.missingVars.join(', ')}`
      };
    }

    if (!APPLE_CONFIG.products.premiumMonthly) {
      return {
        isValid: false,
        error: 'Premium monthly product ID is not configured'
      };
    }

    return { isValid: true };
  }

  /**
   * Step 1: Initiate payment process
   */
  async purchasePremiumSubscription(): Promise<PaymentResult> {
    try {
      // Validate configuration first
      const configValidation = this.validateConfiguration();
      if (!configValidation.isValid) {
        return {
          success: false,
          error: configValidation.error || 'Configuration error',
          platform: Platform.OS as 'ios' | 'android'
        };
      }

      console.log('🛒 Starting premium subscription purchase...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🆔 Product ID:', this.PREMIUM_PRODUCT_ID);

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

    } catch (error: any) {
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
      const regionPricing = this.getUserRegionPricing();
      const mockReceipt = {
        success: true,
        receipt: 'mock_ios_receipt_data_base64_encoded',
        transactionId: 'ios_' + Date.now(),
        productId: this.PREMIUM_PRODUCT_ID,
        platform: 'ios' as const,
        price: regionPricing.price,
        currency: regionPricing.currency
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
      const regionPricing = this.getUserRegionPricing();
      const mockReceipt = {
        success: true,
        receipt: JSON.stringify({
          packageName: 'com.yourcompany.learnai',
          productId: this.PREMIUM_PRODUCT_ID,
          purchaseToken: 'mock_android_purchase_token_' + Date.now()
        }),
        transactionId: 'android_' + Date.now(),
        productId: this.PREMIUM_PRODUCT_ID,
        platform: 'android' as const,
        price: regionPricing.price,
        currency: regionPricing.currency
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
   * New Flow: Payment -> Firebase Auth Account -> Store in courseCounts.json -> Login
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
      // Step 1: Process payment using Apple/Google Pay
      console.log('🛒 Step 1: Processing payment with Apple/Google Pay...');
      const paymentResult = await this.purchasePremiumSubscription();

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error,
          message: 'Payment failed. Please try again.',
          step: 'payment'
        };
      }

      // Step 2: Create Firebase Auth account
      console.log('🔐 Step 2: Creating Firebase Auth account...');
      const firebaseResult = await this.createFirebaseAccount(email, password);

      if (!firebaseResult.success) {
        return {
          success: false,
          error: firebaseResult.error,
          message: 'Payment successful but account creation failed. Please contact support.',
          step: 'firebase_auth'
        };
      }

      // Step 3: Store user data and course count in backend
      console.log('📊 Step 3: Storing user data in courseCounts.json...');
      const storeResult = await this.storeUserDataInBackend(firebaseResult.user, paymentResult);

      if (!storeResult.success) {
        return {
          success: false,
          error: storeResult.error,
          message: 'Account created but data storage failed. Please contact support.',
          step: 'data_storage'
        };
      }

      // Step 4: User is automatically logged in through Firebase Auth
      console.log('✅ Step 4: User logged in successfully');

      return {
        success: true,
        user: firebaseResult.user,
        courseStatus: storeResult.courseStatus,
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
   * Get user's region and return appropriate pricing
   */
  private getUserRegionPricing(): { price: string; currency: string } {
    try {
      // Get user's locale/region
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const region = locale.split('-')[1] || 'US';
      
      // European countries
      const europeanCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'GR', 'FI', 'EE', 'LV', 'LT', 'LU', 'MT', 'SK', 'SI', 'CY', 'HR', 'BG', 'RO', 'HU', 'PL', 'CZ', 'DK', 'SE', 'GB'];
      
      if (europeanCountries.includes(region)) {
        return { price: '€9.99', currency: 'EUR' };
      } else {
        return { price: '$8.99', currency: 'USD' };
      }
    } catch (error) {
      // Default to USD if region detection fails
      return { price: '$8.99', currency: 'USD' };
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
      const regionPricing = this.getUserRegionPricing();
      
      // This would integrate with react-native-iap to get actual product info
      // For now, return mock data with regional pricing
      return {
        success: true,
        products: [
          {
            productId: this.PREMIUM_PRODUCT_ID,
            title: 'LearnIntel Premium',
            description: '50 courses per month + premium features',
            price: regionPricing.price,
            currency: regionPricing.currency
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

  /**
   * Create Firebase Auth account
   */
  private async createFirebaseAccount(email: string, password: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      console.log('🔐 Creating Firebase account for:', email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get the ID token
      const idToken = await user.getIdToken();
      
      console.log('✅ Firebase account created successfully');
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          idToken: idToken
        }
      };
      
    } catch (error: any) {
      console.error('❌ Firebase account creation failed:', error);
      
      let errorMessage = 'Account creation failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email address is already in use';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Store user data in backend courseCounts.json
   */
  private async storeUserDataInBackend(user: any, paymentResult: PaymentResult): Promise<{
    success: boolean;
    courseStatus?: any;
    error?: string;
  }> {
    try {
      console.log('📊 Storing user data in backend...');
      
      const response = await fetch(`${this.BACKEND_URL}/api/auth/create-premium-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.idToken}`
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          paymentReceipt: paymentResult,
          subscriptionType: 'premium_monthly',
          courseLimit: 50, // Premium users get 50 courses per month
          createdAt: new Date().toISOString()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Backend storage failed:', result);
        return {
          success: false,
          error: result.error || 'Failed to store user data'
        };
      }

      console.log('✅ User data stored in backend successfully');
      
      return {
        success: true,
        courseStatus: result.courseStatus
      };

    } catch (error) {
      console.error('❌ Backend storage error:', error);
      return {
        success: false,
        error: 'Network error during data storage'
      };
    }
  }
}

export default PaymentService;
