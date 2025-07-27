import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';
import { useAuth } from '../../contexts/AuthContext';
import PaymentService from '../../services/paymentService';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';

interface PremiumSubscriptionProps {
  onClose?: () => void;
  onSuccess?: (user: any) => void;
}

export const PremiumSubscriptionScreen: React.FC<PremiumSubscriptionProps> = ({
  onClose,
  onSuccess
}) => {
  const { theme } = useTheme();
  const { refreshCourseStatus } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'products' | 'signup' | 'signin'>('products');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [products, setProducts] = useState<any[]>([]);

  const paymentService = PaymentService.getInstance();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const result = await paymentService.getAvailableProducts();
      if (result.success && result.products) {
        setProducts(result.products);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handlePurchaseAndSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);

      // Show payment confirmation
      Alert.alert(
        '🛒 Confirm Purchase',
        'You will be charged for the premium subscription. After payment, your premium account will be created automatically.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Purchase & Create Account', 
            onPress: async () => {
              const result = await paymentService.purchaseAndCreateAccount(email, password);
              
              if (result.success) {
                Alert.alert(
                  '🎉 Success!',
                  'Your premium account has been created successfully! You can now sign in.',
                  [
                    {
                      text: 'Sign In Now',
                      onPress: () => handleSignIn()
                    }
                  ]
                );
                await refreshCourseStatus();
                if (onSuccess) {
                  onSuccess(result.user);
                }
              } else {
                Alert.alert(
                  '❌ Error',
                  result.message || 'Account creation failed',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );

    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    try {
      setLoading(true);

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseToken = await userCredential.user.getIdToken();

      // Verify with backend
      const result = await paymentService.signInPremiumAccount(email, firebaseToken);

      if (result.success) {
        Alert.alert(
          '✅ Welcome Back!',
          'You have successfully signed in to your premium account.',
          [{ text: 'OK' }]
        );
        await refreshCourseStatus();
        if (onSuccess) {
          onSuccess(result.user);
        }
        if (onClose) {
          onClose();
        }
      } else {
        Alert.alert(
          '❌ Sign In Failed',
          result.message || 'Please check your credentials',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert(
        '❌ Sign In Failed',
        'Invalid email or password. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderProductsView = () => (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.text }]}>
        🚀 Upgrade to Premium
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.inputText }]}>
        Get more courses and premium features
      </Text>

      {products.map((product, index) => (
        <View key={index} style={[styles.productCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.productTitle, { color: theme.cardText }]}>
            {product.title}
          </Text>
          <Text style={[styles.productDescription, { color: theme.cardText }]}>
            {product.description}
          </Text>
          <Text style={[styles.productPrice, { color: theme.primary }]}>
            {product.price}/month
          </Text>
        </View>
      ))}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={() => setMode('signup')}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: theme.background }]}>
            🛒 Purchase & Create Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.primary }]}
          onPress={() => setMode('signin')}
          disabled={loading}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>
            Already have premium? Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSignupView = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('products')}
      >
        <Text style={[styles.backButtonText, { color: theme.primary }]}>
          ← Back to Products
        </Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        Create Premium Account
      </Text>

      <Text style={[styles.subtitle, { color: theme.inputText }]}>
        Payment will be processed first, then your account will be created
      </Text>

      <TextInput
        style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBackground }]}
        placeholder="Email Address"
        placeholderTextColor={theme.inputText}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />

      <TextInput
        style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBackground }]}
        placeholder="Password (min 6 characters)"
        placeholderTextColor={theme.inputText}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TextInput
        style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBackground }]}
        placeholder="Confirm Password"
        placeholderTextColor={theme.inputText}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.primary }]}
        onPress={handlePurchaseAndSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.background} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.background }]}>
            🛒 Purchase Premium ($9.99/month)
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSigninView = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('products')}
      >
        <Text style={[styles.backButtonText, { color: theme.primary }]}>
          ← Back to Products
        </Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        Sign In to Premium
      </Text>

      <Text style={[styles.subtitle, { color: theme.inputText }]}>
        Enter your premium account credentials
      </Text>

      <TextInput
        style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBackground }]}
        placeholder="Email Address"
        placeholderTextColor={theme.inputText}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />

      <TextInput
        style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBackground }]}
        placeholder="Password"
        placeholderTextColor={theme.inputText}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.primary }]}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.background} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.background }]}>
            🔐 Sign In
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={[styles.closeButtonText, { color: theme.text }]}>✕</Text>
        </TouchableOpacity>
      )}

      {mode === 'products' && renderProductsView()}
      {mode === 'signup' && renderSignupView()}
      {mode === 'signin' && renderSigninView()}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.inputText }]}>
          Secure payment processing • Cancel anytime
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  productCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 20,
  },
  primaryButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PremiumSubscriptionScreen;
