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
import { useTheme } from '../theme';
import APP_CONFIG from '../../config/appConfig';

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
  const { theme, mode } = useTheme();
  const styles = getStyles(theme, mode);

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
        `Up to ${APP_CONFIG.COURSE_LIMITS.PREMIUM_USER_MONTHLY_LIMIT} AI-powered courses per month`,
        'Priority customer support',
        'No advertisements',
      ].map((feature, index) => (
        <View key={index} style={styles.featureItem}>
          <FontAwesome name="check" size={16} color={mode === 'light' ? '#4CAF50' : theme.secondary} />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  );

  const renderProduct = (product: SubscriptionProduct) => {
    const isPurchasing = purchasing === product.productId;
    
    return (
      <TouchableOpacity
        key={product.productId}
        style={styles.productCard}
        onPress={() => handlePurchase(product.productId)}
        disabled={isPurchasing || purchasing !== null}
      >
        <Text style={styles.productTitle}>{product.title}</Text>
        <Text style={styles.productPrice}>{product.price}</Text>
        <Text style={styles.productDescription}>{product.description}</Text>
        
        {isPurchasing ? (
          <ActivityIndicator color="#fff" style={styles.purchaseButton} />
        ) : (
          <View style={styles.purchaseButton}>
            <Text style={styles.purchaseButtonText}>
              Choose Plan
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
          <ActivityIndicator size="large" color={mode === 'light' ? '#007AFF' : theme.secondary} />
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
            <ActivityIndicator color={mode === 'light' ? '#007AFF' : theme.secondary} />
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

const getStyles = (theme: any, mode: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mode === 'light' ? '#f8f9fa' : theme.background,
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
    color: mode === 'light' ? '#666' : theme.text,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: mode === 'light' ? '#333' : theme.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: mode === 'light' ? '#666' : theme.text,
    textAlign: 'center',
    lineHeight: 22,
    opacity: mode === 'light' ? 1 : 0.8,
  },
  featuresContainer: {
    backgroundColor: mode === 'light' ? '#fff' : theme.card,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: mode === 'light' ? '#000' : theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: mode === 'light' ? '#333' : theme.text,
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
    color: mode === 'light' ? '#555' : theme.text,
    opacity: mode === 'light' ? 1 : 0.9,
  },
  productsContainer: {
    marginBottom: 30,
  },
  productsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: mode === 'light' ? '#333' : theme.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: mode === 'light' ? '#fff' : theme.card,
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: mode === 'light' ? '#000' : theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: mode === 'light' ? '#333' : theme.text,
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: mode === 'light' ? '#007AFF' : theme.secondary,
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: mode === 'light' ? '#666' : theme.text,
    marginBottom: 10,
    opacity: mode === 'light' ? 1 : 0.8,
  },
  purchaseButton: {
    backgroundColor: mode === 'light' ? '#007AFF' : theme.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: mode === 'light' ? '#fff' : '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  restoreButtonText: {
    color: mode === 'light' ? '#007AFF' : theme.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  skipButtonText: {
    color: mode === 'light' ? '#666' : theme.text,
    fontSize: 16,
    opacity: mode === 'light' ? 1 : 0.7,
  },
  termsText: {
    fontSize: 12,
    color: mode === 'light' ? '#999' : theme.text,
    textAlign: 'center',
    lineHeight: 18,
    opacity: mode === 'light' ? 1 : 0.6,
  },
});

export default SubscriptionScreen;
