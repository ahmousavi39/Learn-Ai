import * as React from 'react';
import { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import subscriptionService, { SubscriptionProduct } from '../../services/subscriptionService';
import authService from '../../services/authService';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../theme';
import APP_CONFIG from '../../config/appConfig';

interface SubscriptionScreenProps {
  onSubscriptionSuccess: (user: any) => void;
  onSkip?: () => void;
  onSignupRequired?: () => void;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onSubscriptionSuccess,
  onSkip,
  onSignupRequired,
}) => {
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const { theme, mode } = useTheme();
  const styles = getStyles(theme, mode as 'light' | 'dark');

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

  const handleSubscribeClick = async (productId: string) => {
    try {
      console.log('🛒 Step 1: User clicked subscribe button for product:', productId);

      // Store the selected product ID for the signup process
      await AsyncStorage.setItem('selectedProductId', productId);

      // Step 2: Redirect to signup page
      console.log('📝 Step 2: Redirecting to signup page...');
      if (onSignupRequired) {
        onSignupRequired();
      } else {
        console.log('⚠️ No onSignupRequired callback available');
        Alert.alert('Error', 'Unable to proceed to signup');
      }
    } catch (error: any) {
      console.error('❌ Error starting subscription flow:', error);
      Alert.alert('Error', 'Unable to start subscription process');
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setRestoring(true);
      console.log('🔄 Restoring purchases...');

      const restored = await subscriptionService.restorePurchases();

      if (restored) {
        // Check if user has active subscription
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/auth/check-subscription`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              // We'd need some identifier here - this is a simplified version
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.hasSubscription) {
              onSubscriptionSuccess({ hasSubscription: true });
              return;
            }
          }
        } catch (checkError) {
          console.log('Could not verify subscription status');
        }

        Alert.alert('Restored', 'Purchase restored successfully');
      } else {
        Alert.alert('No Purchases', 'No previous purchases found to restore');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to restore purchases');
    } finally {
      setRestoring(false);
    }
  };

  const clearSubscriptionData = async () => {
    try {
      await AsyncStorage.removeItem('subscription_data');
      await AsyncStorage.removeItem('user_subscription');
      await AsyncStorage.removeItem('pendingAccountDetails');
      Alert.alert('Debug', 'Subscription data cleared');
    } catch (error) {
      console.error('Error clearing subscription data:', error);
    }
  };

  const renderFeatures = () => {
    const features = [
      '50 AI-generated courses per month',
      'Advanced learning algorithms',
      'Personalized study plans',
      'Offline course access',
      'Priority customer support',
      'No ads or interruptions',
    ];

    return (
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Premium Features</Text>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <FontAwesome name="check" size={16} color={mode === 'light' ? '#4CAF50' : theme.secondary} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderProduct = (product: SubscriptionProduct) => {
    const isPurchasing = purchasing === product.productId;

    return (
      <TouchableOpacity
        key={product.productId}
        style={styles.productCard}
        onPress={() => handleSubscribeClick(product.productId)}
        disabled={isPurchasing || purchasing !== null}
      >
        <Text style={styles.productTitle}>{product.title}</Text>
        <Text style={styles.productPrice}>{product.price}</Text>
        <Text style={styles.productDescription}>{product.description}</Text>

        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>🧪 Sandbox Mode</Text>
            <Text style={styles.debugText}>Product ID: {product.productId}</Text>
            <Text style={styles.debugText}>Test User: {process.env.APPLE_SANDBOX_TEST_EMAIL_1}</Text>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={clearSubscriptionData}
            >
              <Text style={styles.debugButtonText}>Clear Sub Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPurchasing ? (
          <View style={styles.purchaseButton}>
            <ActivityIndicator color="#fff" />
            <Text style={[styles.purchaseButtonText, { marginLeft: 8 }]}>
              Processing Payment...
            </Text>
          </View>
        ) : (
          <View style={styles.purchaseButton}>
            <Text style={styles.purchaseButtonText}>
              Purchase & Continue
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
            Choose your plan and pay securely. Create your account after payment verification.
          </Text>
        </View>

        {renderFeatures()}

        <View style={styles.productsContainer}>
          {products.map(renderProduct)}
        </View>

        <View style={styles.footer}>
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
              <Text style={styles.skipButtonText}>Continue with Free Version</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            • Subscription auto-renews unless cancelled 24 hours before period ends{'\n'}
            • Manage subscriptions in App Store settings{'\n'}
            • Terms apply: https://learnintel.ahmousavi.com/terms{'\n'}
            • Privacy: https://learnintel.ahmousavi.com/policy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme: any, mode: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.text,
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    featuresContainer: {
      marginBottom: 30,
    },
    featuresTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 10,
    },
    featureText: {
      fontSize: 16,
      color: theme.text,
      marginLeft: 12,
      flex: 1,
    },
    productsContainer: {
      marginBottom: 30,
    },
    productCard: {
      backgroundColor: mode === 'light' ? '#f8f9fa' : theme.cardBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: mode === 'light' ? '#e9ecef' : theme.border,
    },
    productTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    productPrice: {
      fontSize: 24,
      fontWeight: 'bold',
      color: mode === 'light' ? '#007AFF' : theme.primary,
      marginBottom: 8,
    },
    productDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    purchaseButton: {
      backgroundColor: mode === 'light' ? '#007AFF' : theme.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      flexDirection: 'row',
    },
    purchaseButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    debugInfo: {
      backgroundColor: mode === 'light' ? '#fff3cd' : '#332701',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: mode === 'light' ? '#ffeaa7' : '#996f01',
    },
    debugText: {
      fontSize: 12,
      color: mode === 'light' ? '#856404' : '#ffeaa7',
      marginBottom: 4,
    },
    debugButton: {
      backgroundColor: mode === 'light' ? '#ffc107' : '#996f01',
      padding: 8,
      borderRadius: 4,
      marginTop: 8,
      alignItems: 'center',
    },
    debugButtonText: {
      color: mode === 'light' ? '#000' : '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    footer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    restoreButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    restoreButtonText: {
      fontSize: 16,
      color: mode === 'light' ? '#007AFF' : theme.primary,
      textAlign: 'center',
    },
    skipButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    skipButtonText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    disclaimer: {
      marginTop: 20,
      paddingHorizontal: 10,
    },
    disclaimerText: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });

export default SubscriptionScreen;
