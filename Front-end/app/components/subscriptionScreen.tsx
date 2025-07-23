import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import subscriptionService, { SubscriptionProduct } from '../../services/subscriptionService';
import authService from '../../services/authService';
import { FontAwesome } from '@expo/vector-icons';

interface SubscriptionScreenProps {
  onSubscriptionSuccess: (user: any) => void;
  onSkip?: () => void;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onSubscriptionSuccess,
  onSkip,
}) => {
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const subscriptionProducts = await subscriptionService.getSubscriptionProducts();
      setProducts(subscriptionProducts);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load subscription products');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasing(productId);
      
      const result = await subscriptionService.purchaseSubscription(productId);
      
      if (result.success) {
        Alert.alert(
          'Success!',
          'Your subscription has been activated. You can now create your account.',
          [
            {
              text: 'Continue',
              onPress: () => {
                onSubscriptionSuccess({ hasSubscription: true });
              },
            },
          ]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'Unable to complete purchase');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setRestoring(true);
      const restored = await subscriptionService.restorePurchases();
      
      if (restored) {
        Alert.alert(
          'Success!',
          'Your subscription has been restored.',
          [
            {
              text: 'Continue',
              onPress: () => {
                onSubscriptionSuccess({ hasSubscription: true });
              },
            },
          ]
        );
      } else {
        Alert.alert('No Purchases Found', 'No active subscriptions were found to restore.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to restore purchases');
    } finally {
      setRestoring(false);
    }
  };

  const renderFeatures = () => (
    <View style={styles.featuresContainer}>
      <Text style={styles.featuresTitle}>Premium Features</Text>
      {[
        'Unlimited AI-powered lessons',
        'Personalized learning paths',
        'Advanced progress tracking',
        'Offline mode access',
        'Priority customer support',
        'No advertisements',
      ].map((feature, index) => (
        <View key={index} style={styles.featureItem}>
          <FontAwesome name="check" size={16} color="#4CAF50" />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  );

  const renderProduct = (product: SubscriptionProduct) => {
    const isYearly = product.productId.includes('yearly');
    const isPurchasing = purchasing === product.productId;
    
    return (
      <TouchableOpacity
        key={product.productId}
        style={[
          styles.productCard,
          isYearly && styles.popularProduct,
        ]}
        onPress={() => handlePurchase(product.productId)}
        disabled={isPurchasing || purchasing !== null}
      >
        {isYearly && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>Most Popular</Text>
          </View>
        )}
        
        <Text style={styles.productTitle}>{product.title}</Text>
        <Text style={styles.productPrice}>{product.price}</Text>
        <Text style={styles.productDescription}>{product.description}</Text>
        
        {isYearly && (
          <Text style={styles.savingsText}>Save 30% compared to monthly</Text>
        )}
        
        {isPurchasing ? (
          <ActivityIndicator color="#fff" style={styles.purchaseButton} />
        ) : (
          <View style={styles.purchaseButton}>
            <Text style={styles.purchaseButtonText}>
              {isYearly ? 'Choose Yearly' : 'Choose Monthly'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Unlock Premium Learning</Text>
          <Text style={styles.subtitle}>
            Subscribe to access all features and start your learning journey
          </Text>
        </View>

        {renderFeatures()}

        <View style={styles.productsContainer}>
          <Text style={styles.productsTitle}>Choose Your Plan</Text>
          {products.map(renderProduct)}
        </View>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.termsText}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Subscriptions auto-renew unless cancelled.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#555',
  },
  productsContainer: {
    marginBottom: 30,
  },
  productsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  popularProduct: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  savingsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 15,
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SubscriptionScreen;
