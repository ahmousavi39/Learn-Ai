import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService, { AuthUser } from '../../services/authService';
import subscriptionService from '../../services/subscriptionService';
import paymentService from '../../services/paymentService';
import SubscriptionScreen from './subscriptionScreen';
import { FontAwesome } from '@expo/vector-icons';

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
  initialMode?: 'login' | 'signup' | 'subscription' | 'forgotPassword';
}

type AuthMode = 'login' | 'signup' | 'subscription' | 'forgotPassword';

const LoginScreen: React.FC<LoginProps> = ({ onLoginSuccess, initialMode = 'login' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        const hasSubscription = await authService.checkSubscriptionStatus(user.uid);
        if (hasSubscription) {
          onLoginSuccess(user);
        } else {
          // User exists but no subscription, redirect to subscription
          setMode('subscription');
        }
      }
    } catch (error) {
      console.error('Error checking existing user:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return false;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }

      if (!displayName.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return false;
      }
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const result = await authService.signIn(email, password);
      
      if (result.user && result.hasSubscription) {
        onLoginSuccess(result.user);
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      console.log('📝 Starting 9-step subscription flow...');
      
      // Step 3: User enters info (form validation already done)
      // Step 4: Validate email with backend (no duplicated email)
      console.log('🔍 Step 4: Validating email with backend...');
      
      const emailValidationResponse = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/auth/validate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const emailValidation = await emailValidationResponse.json();

      if (!emailValidation.success) {
        Alert.alert(
          'Email Validation Failed',
          emailValidation.message || 'This email is already registered or invalid.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      console.log('✅ Step 4 completed: Email validation passed');

      // Step 5: Get the selected product ID from subscription flow
      const selectedProductId = await AsyncStorage.getItem('selectedProductId');
      if (!selectedProductId) {
        Alert.alert(
          'Subscription Required',
          'Please select a subscription plan first.',
          [
            {
              text: 'Select Plan',
              onPress: () => setMode('subscription')
            }
          ]
        );
        setLoading(false);
        return;
      }

      console.log('💳 Step 5: Initiating Apple payment for product:', selectedProductId);

      // Step 5: Process Apple payment
      const purchaseResult = await paymentService.getInstance().purchasePremiumSubscription();
      
      if (!purchaseResult.success) {
        Alert.alert(
          'Payment Failed',
          purchaseResult.error || 'Unable to process payment. Please try again.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      console.log('✅ Step 5 completed: Apple payment successful');
      console.log('� Step 6: Verifying payment with backend...');

      // Step 6: Verify payment with backend
      const verificationResponse = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/subscriptions/process-payment-first`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receipt: purchaseResult.receipt,
          purchaseToken: purchaseResult.transactionId,
          productId: selectedProductId,
          platform: 'ios',
          userEmail: email
        }),
      });

      const verificationResult = await verificationResponse.json();

      if (!verificationResult.success) {
        Alert.alert(
          'Payment Verification Failed',
          'Payment was processed but could not be verified. Please contact support.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      console.log('✅ Step 6 completed: Payment verified by backend');
      console.log('🔥 Step 7: Creating Firebase account...');

      // Step 7: Create Firebase account
      const user = await authService.createAccount(email, password, displayName);
      console.log('✅ Step 7 completed: Firebase account created:', user.uid);

      console.log('📊 Step 8: Adding UID to courseCount.json...');

      // Step 8: Claim subscription and add to courseCount.json
      const claimResponse = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/subscriptions/claim-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationToken: verificationResult.verificationToken,
          uid: user.uid,
          email: user.email
        }),
      });

      const claimResult = await claimResponse.json();

      if (!claimResult.success) {
        Alert.alert(
          'Subscription Activation Failed',
          'Account created but subscription could not be activated. Please contact support.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      console.log('✅ Step 8 completed: UID added to courseCount.json');
      console.log('💾 Step 9: Storing login info locally...');

      // Step 9: Store needed info locally to stay logged in
      await authService.updateUserSubscription(user.uid, {
        productId: claimResult.subscription.productId,
        purchaseDate: claimResult.subscription.linkedAt,
        isActive: claimResult.subscription.isActive,
        subscriptionId: claimResult.subscription.subscriptionId,
        isMockPurchase: claimResult.subscription.isMockPurchase || false
      });

      // Clear the selected product ID
      await AsyncStorage.removeItem('selectedProductId');

      const updatedUser = {
        ...user,
        hasSubscription: true,
        subscriptionData: claimResult.subscription
      };

      console.log('✅ Step 9 completed: All subscription flow steps completed successfully!');

      Alert.alert(
        'Account Created Successfully!',
        'Your account has been created and your subscription is now active. Welcome to Learn AI!',
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('🎉 9-step subscription flow completed successfully');
              onLoginSuccess(updatedUser);
            }
          }
        ]
      );
      return;

    } catch (error) {
      console.error('❌ Signup error:', error);
      Alert.alert(
        'Account Creation Failed',
        error.message || 'An error occurred while creating your account. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email first');
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword(email);
      Alert.alert(
        'Reset Email Sent',
        'Check your email for password reset instructions',
        [{ text: 'OK', onPress: () => setMode('login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionSuccess = (data: any) => {
    // If user already exists and has subscription, login directly
    if (data.uid) {
      onLoginSuccess(data);
    } else {
      // Otherwise, store subscription data and proceed to signup
      setSubscriptionData(data);
      setMode('signup');
    }
  };

  const handleSignupRequired = () => {
    // User tried to purchase but needs to signup first
    setMode('signup');
  };

  if (mode === 'subscription') {
    return (
      <SubscriptionScreen
        onSubscriptionSuccess={handleSubscriptionSuccess}
        onSignupRequired={handleSignupRequired}
        onSkip={() => setMode('login')}
      />
    );
  }

  const renderLoginForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>

      <View style={styles.inputContainer}>
        <FontAwesome name="envelope" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <View style={styles.inputContainer}>
        <FontAwesome name="lock" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="password"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <FontAwesome 
            name={showPassword ? "eye" : "eye-slash"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setMode('forgotPassword')}
      >
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setMode('subscription')}
      >
        <Text style={styles.secondaryButtonText}>Create New Account</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSignupForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Complete your account setup</Text>

      {subscriptionData?.hasSubscription && (
        <View style={styles.subscriptionStatus}>
          <FontAwesome name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.subscriptionStatusText}>
            ✅ Subscription Active - Ready to create account
          </Text>
        </View>
      )}

      {!subscriptionData?.hasSubscription && (
        <View style={styles.subscriptionWarning}>
          <FontAwesome name="exclamation-triangle" size={20} color="#FF9800" />
          <Text style={styles.subscriptionWarningText}>
            ⚠️ No active subscription - Subscribe first to continue
          </Text>
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={() => setMode('subscription')}
          >
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <FontAwesome name="user" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
        />
      </View>

      <View style={styles.inputContainer}>
        <FontAwesome name="envelope" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <View style={styles.inputContainer}>
        <FontAwesome name="lock" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <FontAwesome 
            name={showPassword ? "eye" : "eye-slash"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <FontAwesome name="lock" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setMode('login')}
      >
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderForgotPasswordForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>

      <View style={styles.inputContainer}>
        <FontAwesome name="envelope" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleForgotPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Send Reset Email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setMode('login')}
      >
        <Text style={styles.linkText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {mode === 'login' && renderLoginForm()}
          {mode === 'signup' && renderSignupForm()}
          {mode === 'forgotPassword' && renderForgotPasswordForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 5,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#666',
  },
  subscriptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  subscriptionStatusText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  subscriptionWarning: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  subscriptionWarningText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
    marginBottom: 10,
  },
  subscribeButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 5,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;