import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as GoogleSignIn from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import AuthService from '../../services/authService';
import PaymentService from '../../services/paymentService';

WebBrowser.maybeCompleteAuthSession();

const paymentService = PaymentService.getInstance();

interface UniversalAuthScreenProps {
  onAuthSuccess: (user: any, hasSubscription: boolean) => void;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'anonymous';
}

export default function UniversalAuthScreen({ 
  onAuthSuccess, 
  onClose, 
  initialMode = 'signin' 
}: UniversalAuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'anonymous' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Sign-In configuration
  const [request, response, promptAsync] = GoogleSignIn.useAuthRequest({
    clientId: 'YOUR_EXPO_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSignIn(response.authentication?.accessToken);
    }
  }, [response]);

  // Email/Password Sign In
  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.signIn(email, password);
      if (result.user) {
        onAuthSuccess(result.user, result.hasSubscription);
      }
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Sign Up (Premium only - requires payment)
  const handleEmailSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    Alert.alert(
      'Premium Account',
      'Creating an account requires a premium subscription. You will be redirected to purchase.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => handlePremiumSignUp()
        }
      ]
    );
  };

  // Premium Sign Up with Payment
  const handlePremiumSignUp = async () => {
    setLoading(true);
    try {
      const result = await paymentService.purchaseAndCreateAccount(email, password);
      
      if (result.success && result.user) {
        Alert.alert('Success', 'Premium account created successfully!');
        onAuthSuccess(result.user, true);
      }
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async (accessToken?: string) => {
    if (!accessToken) {
      setLoading(true);
      try {
        await promptAsync();
      } catch (error: any) {
        Alert.alert('Google Sign In Failed', error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.signInWithGoogle(accessToken);
      if (result.user) {
        onAuthSuccess(result.user, result.hasSubscription);
      }
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Apple Sign In
  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const result = await AuthService.signInWithApple(
          credential.identityToken,
          undefined // Remove nonce parameter as it's not available
        );
        if (result.user) {
          onAuthSuccess(result.user, result.hasSubscription);
        }
      }
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert('Apple Sign In Failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Anonymous Sign In
  const handleAnonymousSignIn = async () => {
    setLoading(true);
    try {
      const user = await AuthService.signInAnonymously();
      if (user) {
        onAuthSuccess(user, false);
      }
    } catch (error: any) {
      Alert.alert('Anonymous Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Password Reset
  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await AuthService.resetPassword(email);
      Alert.alert(
        'Reset Email Sent',
        'Check your email for password reset instructions.',
        [{ text: 'OK', onPress: () => setMode('signin') }]
      );
    } catch (error: any) {
      Alert.alert('Reset Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSignInForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Sign In</Text>
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
      />
      
      <Button
        mode="contained"
        onPress={handleEmailSignIn}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Sign In with Email
      </Button>
      
      <TouchableOpacity onPress={() => setMode('reset')}>
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>
      
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.line} />
      </View>
      
      {renderSocialButtons()}
      {renderAnonymousOption()}
      
      <TouchableOpacity onPress={() => setMode('signup')}>
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSignUpForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Create Premium Account</Text>
      <Text style={styles.subtitle}>Premium accounts require payment</Text>
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
      />
      
      <TextInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
      />
      
      <Button
        mode="contained"
        onPress={handleEmailSignUp}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Create Premium Account ($9.99/month)
      </Button>
      
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.line} />
      </View>
      
      {renderSocialButtons()}
      {renderAnonymousOption()}
      
      <TouchableOpacity onPress={() => setMode('signin')}>
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResetForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Reset Password</Text>
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      
      <Button
        mode="contained"
        onPress={handlePasswordReset}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Send Reset Email
      </Button>
      
      <TouchableOpacity onPress={() => setMode('signin')}>
        <Text style={styles.linkText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSocialButtons = () => (
    <View style={styles.socialContainer}>
      <Button
        mode="outlined"
        onPress={() => handleGoogleSignIn()}
        disabled={loading}
        style={styles.socialButton}
        icon="google"
      >
        Continue with Google
      </Button>
      
      {Platform.OS === 'ios' && AppleAuthentication.isAvailableAsync() && (
        <Button
          mode="outlined"
          onPress={handleAppleSignIn}
          disabled={loading}
          style={styles.socialButton}
          icon="apple"
        >
          Continue with Apple
        </Button>
      )}
    </View>
  );

  const renderAnonymousOption = () => (
    <View style={styles.anonymousContainer}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.line} />
      </View>
      
      <Button
        mode="text"
        onPress={handleAnonymousSignIn}
        disabled={loading}
        style={styles.anonymousButton}
      >
        Continue as Guest (2 courses/month)
      </Button>
    </View>
  );

  const renderContent = () => {
    switch (mode) {
      case 'signin':
        return renderSignInForm();
      case 'signup':
        return renderSignUpForm();
      case 'reset':
        return renderResetForm();
      default:
        return renderSignInForm();
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        
        {renderContent()}
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#white" />
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginVertical: 10,
    paddingVertical: 5,
  },
  socialContainer: {
    marginVertical: 10,
  },
  socialButton: {
    marginVertical: 5,
  },
  anonymousContainer: {
    marginTop: 10,
  },
  anonymousButton: {
    marginVertical: 5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  linkText: {
    color: '#667eea',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
