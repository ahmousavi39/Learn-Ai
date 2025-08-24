import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Conditionally import InAppPurchases to avoid native module errors in Expo Go
let InAppPurchases: any = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch (error) {
  console.warn('expo-in-app-purchases not available, using mock data');
}

export interface SubscriptionProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

export interface PurchaseResult {
  success: boolean;
  receipt?: string;
  purchaseToken?: string;
  transactionId?: string;
  verificationToken?: string; // New: for payment-first flow
  error?: string;
}

class SubscriptionService {
  private static instance: SubscriptionService;
  private isInitialized = false;
  private isAvailable = false;
  
  // Define your subscription product IDs
  private readonly SUBSCRIPTION_PRODUCTS = {
    monthly: Platform.OS === 'ios' 
      ? (process.env.EXPO_PUBLIC_APPLE_PREMIUM_MONTHLY_PRODUCT_ID || 'com.ahmousavi.learnintel.monthly')
      : 'com.ahmousavi.learnintel.monthly_android',
  };

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  private checkAvailability(): boolean {
    // Check if we're in a development environment without native modules
    try {
      // First check if the module was loaded at all
      if (!InAppPurchases) {
        console.warn('In-app purchases module not loaded. Using mock data.');
        return false;
      }
      
      // Try to access the native module to see if it's available
      const isNativeModuleAvailable = InAppPurchases && typeof InAppPurchases.connectAsync === 'function';
      if (!isNativeModuleAvailable) {
        console.warn('In-app purchases native module not available. Using mock data.');
        return false;
      }
      
      if (__DEV__ && !Constants.appOwnership) {
        console.warn('In-app purchases not available in Expo Go. Using mock data.');
        return false;
      }
      return true;
    } catch (error) {
      console.warn('In-app purchases not available. Using mock data.');
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.isAvailable = this.checkAvailability();
    if (!this.isAvailable) {
      console.warn('In-app purchases not available in this environment. Using mock data.');
      this.isInitialized = true; // Mark as initialized even with mock data
      return;
    }

    try {
      await InAppPurchases.connectAsync();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize in-app purchases:', error);
      console.warn('Falling back to mock data for development');
      this.isAvailable = false;
      this.isInitialized = true;
    }
  }

  async getSubscriptionProducts(): Promise<SubscriptionProduct[]> {
    try {
      await this.initialize();
      
      if (!this.isAvailable) {
        // Return mock data for development
        const priceUSD = process.env.EXPO_PUBLIC_APPLE_PRICE_USD || '8.99';
        const priceEUR = process.env.EXPO_PUBLIC_APPLE_PRICE_EUR || '9.99';
        
        return [
          {
            productId: this.SUBSCRIPTION_PRODUCTS.monthly,
            title: 'LearnIntel Monthly Premium',
            description: 'Monthly auto-renewable subscription (Development Mode)',
            price: `$${priceUSD}`,
            priceAmountMicros: parseFloat(priceUSD) * 1000000,
            priceCurrencyCode: 'USD',
          }
        ];
      }
      
      const productIds = Object.values(this.SUBSCRIPTION_PRODUCTS);
      const { results } = await InAppPurchases.getProductsAsync(productIds);
      
      return results.map(product => ({
        productId: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        priceAmountMicros: product.priceAmountMicros,
        priceCurrencyCode: product.priceCurrencyCode,
      }));
    } catch (error) {
      console.error('Error fetching subscription products:', error);
      throw new Error('Failed to fetch subscription products');
    }
  }

  // New method: Process payment first (before account creation)
  async processPaymentFirst(productId: string, userEmail?: string): Promise<PurchaseResult> {
    try {
      await this.initialize();
      
      if (!this.isAvailable) {
        // Simulate sandbox purchase for development
        console.log('🛒 Simulating Payment-First Apple Store Sandbox Purchase...');
        console.log('📱 Product ID:', productId);
        console.log('👤 User Email:', userEmail || 'not provided');
        
        // Simulate a delay like real App Store
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create mock purchase data
        const mockPurchaseData = {
          receipt: `sandbox-receipt-${Date.now()}`,
          purchaseToken: `sandbox-token-${Date.now()}`,
          productId: productId,
          platform: Platform.OS,
          userEmail: userEmail || null
        };
        
        // Verify with backend using payment-first endpoint
        console.log('🔍 Processing payment-first verification with backend...');
        const verificationResult = await this.processPaymentFirstWithBackend(mockPurchaseData);
        
        if (verificationResult.success) {
          console.log('✅ Payment-first verification successful');
          return {
            success: true,
            receipt: mockPurchaseData.receipt,
            purchaseToken: mockPurchaseData.purchaseToken,
            transactionId: `sandbox-txn-${Date.now()}`,
            verificationToken: verificationResult.verificationToken,
          };
        } else {
          console.log('❌ Payment-first verification failed');
          return {
            success: false,
            error: verificationResult.error || 'Backend verification failed',
          };
        }
      }
      
      // Real purchase flow for production
      await InAppPurchases.purchaseItemAsync(productId);
      
      const { results } = await InAppPurchases.getPurchaseHistoryAsync();
      const purchase = results?.find(p => p.productId === productId);
      
      if (purchase) {
        const verificationResult = await this.processPaymentFirstWithBackend({
          receipt: purchase.transactionReceipt,
          purchaseToken: purchase.purchaseToken,
          productId: purchase.productId,
          platform: Platform.OS,
          userEmail: userEmail || null
        });

        if (verificationResult.success) {
          return {
            success: true,
            receipt: purchase.transactionReceipt,
            purchaseToken: purchase.purchaseToken,
            transactionId: purchase.orderId,
            verificationToken: verificationResult.verificationToken,
          };
        } else {
          return {
            success: false,
            error: 'Purchase verification failed',
          };
        }
      }
      
      return {
        success: false,
        error: 'Purchase failed or was cancelled',
      };
    } catch (error: any) {
      console.error('Payment-first purchase error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
      };
    }
  }

  private async processPaymentFirstWithBackend(purchaseData: {
    receipt?: string;
    purchaseToken?: string;
    productId: string;
    platform: string;
    userEmail?: string | null;
  }): Promise<{ success: boolean; error?: string; verificationToken?: string }> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/subscriptions/process-payment-first`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseData),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Backend payment-first processing error:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  async purchaseSubscription(productId: string): Promise<PurchaseResult> {
    try {
      await this.initialize();
      
      if (!this.isAvailable) {
        // Simulate sandbox purchase for development
        console.log('🛒 Simulating Apple Store Sandbox Purchase...');
        console.log('📱 Product ID:', productId);
        
        // Check multiple environment variable formats
        const testUser = process.env.APPLE_SANDBOX_TEST_EMAIL_1 || 
                         process.env.EXPO_PUBLIC_APPLE_SANDBOX_TEST_EMAIL_1 || 
                         'sandbox-test-user@example.com';
        console.log('🧪 Sandbox Test User:', testUser);
        
        // Simulate a delay like real App Store
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create mock purchase data
        const mockPurchaseData = {
          receipt: `sandbox-receipt-${Date.now()}`,
          purchaseToken: `sandbox-token-${Date.now()}`,
          productId: productId,
          platform: Platform.OS,
        };
        
        // Even in sandbox mode, verify with backend
        console.log('🔍 Verifying sandbox purchase with backend...');
        const verificationResult = await this.verifyPurchaseWithBackend(mockPurchaseData);
        
        if (verificationResult.success) {
          console.log('✅ Sandbox purchase verified by backend');
          return {
            success: true,
            receipt: mockPurchaseData.receipt,
            purchaseToken: mockPurchaseData.purchaseToken,
            transactionId: `sandbox-txn-${Date.now()}`,
          };
        } else {
          console.log('❌ Sandbox purchase verification failed');
          return {
            success: false,
            error: verificationResult.error || 'Backend verification failed',
          };
        }
      }
      
      // Purchase the item
      await InAppPurchases.purchaseItemAsync(productId);
      
      // Get purchase history to verify the purchase
      const { results } = await InAppPurchases.getPurchaseHistoryAsync();
      
      // Find the most recent purchase for this product
      const purchase = results?.find(p => p.productId === productId);
      
      if (purchase) {
        // Verify purchase with backend
        const verificationResult = await this.verifyPurchaseWithBackend({
          receipt: purchase.transactionReceipt,
          purchaseToken: purchase.purchaseToken,
          productId: purchase.productId,
          platform: Platform.OS,
        });

        if (verificationResult.success) {
          return {
            success: true,
            receipt: purchase.transactionReceipt,
            purchaseToken: purchase.purchaseToken,
            transactionId: purchase.orderId,
          };
        } else {
          return {
            success: false,
            error: 'Purchase verification failed',
          };
        }
      }
      
      return {
        success: false,
        error: 'Purchase failed or was cancelled',
      };
    } catch (error: any) {
      console.error('Purchase error:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  private async verifyPurchaseWithBackend(purchaseData: {
    receipt?: string;
    purchaseToken?: string;
    productId: string;
    platform: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/subscriptions/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseData),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Backend verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      await this.initialize();
      
      if (!this.isAvailable) {
        return true;
      }
      
      const { results } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (results && results.length > 0) {
        // Find the most recent valid subscription
        const validSubscription = results.find(purchase => 
          Object.values(this.SUBSCRIPTION_PRODUCTS).includes(purchase.productId)
        );

        if (validSubscription) {
          // Verify with backend
          const verificationResult = await this.verifyPurchaseWithBackend({
            receipt: validSubscription.transactionReceipt,
            purchaseToken: validSubscription.purchaseToken,
            productId: validSubscription.productId,
            platform: Platform.OS,
          });

          return verificationResult.success;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (InAppPurchases && this.isAvailable) {
        await InAppPurchases.disconnectAsync();
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('Error disconnecting from in-app purchases:', error);
    }
  }

  getMonthlyProductId(): string {
    return this.SUBSCRIPTION_PRODUCTS.monthly;
  }
}

export default SubscriptionService.getInstance();
