import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform } from 'react-native';

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
  error?: string;
}

class SubscriptionService {
  private static instance: SubscriptionService;
  private isInitialized = false;
  
  // Define your subscription product IDs
  private readonly SUBSCRIPTION_PRODUCTS = {
    monthly: Platform.OS === 'ios' ? 'learn_ai_monthly' : 'learn_ai_monthly_android',
    yearly: Platform.OS === 'ios' ? 'learn_ai_yearly' : 'learn_ai_yearly_android',
  };

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await InAppPurchases.connectAsync();
      this.isInitialized = true;
      console.log('In-app purchases initialized successfully');
    } catch (error) {
      console.error('Failed to initialize in-app purchases:', error);
      throw new Error('Failed to initialize subscription service');
    }
  }

  async getSubscriptionProducts(): Promise<SubscriptionProduct[]> {
    try {
      await this.initialize();
      
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

  async purchaseSubscription(productId: string): Promise<PurchaseResult> {
    try {
      await this.initialize();
      
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
      const response = await fetch(`${process.env.PUBLIC_HTTP_SERVER}/api/subscriptions/verify`, {
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
      await InAppPurchases.disconnectAsync();
      this.isInitialized = false;
    } catch (error) {
      console.error('Error disconnecting from in-app purchases:', error);
    }
  }

  getMonthlyProductId(): string {
    return this.SUBSCRIPTION_PRODUCTS.monthly;
  }

  getYearlyProductId(): string {
    return this.SUBSCRIPTION_PRODUCTS.yearly;
  }
}

export default SubscriptionService.getInstance();
