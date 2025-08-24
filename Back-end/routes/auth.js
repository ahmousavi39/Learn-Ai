const express = require('express');
const { auth, db } = require('../config/firebase');
const receiptVerificationService = require('../services/receiptVerificationService');
const router = express.Router();

// Email validation endpoint for step 4 of subscription flow
router.post('/validate-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        message: 'Please provide an email address to validate.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please enter a valid email address.'
      });
    }

    try {
      // Check if email already exists in Firebase Auth
      await auth.getUserByEmail(email);
      
      // If we reach here, email exists
      return res.status(409).json({
        error: 'Email already exists',
        message: 'This email is already registered. Please use a different email or sign in instead.',
        emailExists: true
      });
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Email doesn't exist - validation passed
        return res.json({
          success: true,
          message: 'Email is available',
          emailExists: false
        });
      }
      
      // Other errors
      throw error;
    }

  } catch (error) {
    console.error('Email validation error:', error);
    res.status(500).json({ 
      error: 'Email validation failed',
      message: 'Unable to validate email. Please try again.'
    });
  }
});

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Check subscription status
router.post('/check-subscription', async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check user subscription in Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.json({ hasValidSubscription: false });
    }

    const userData = userDoc.data();
    const subscription = userData.subscription;

    if (!subscription) {
      return res.json({ hasValidSubscription: false });
    }

    // Check if subscription is still valid
    const now = new Date();
    const expiryDate = new Date(subscription.expiryDate);
    const isValid = subscription.isActive && expiryDate > now;

    res.json({ 
      hasValidSubscription: isValid,
      subscription: isValid ? subscription : null
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user profile after successful subscription
router.post('/create-profile', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { displayName, email, subscription } = req.body;

    // Create or update user profile
    const userProfile = {
      uid,
      email,
      displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subscription: subscription || null
    };

    await db.collection('users').doc(uid).set(userProfile, { merge: true });

    res.json({ 
      success: true, 
      message: 'User profile created successfully',
      user: userProfile
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    res.json({ user: userData });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.uid;
    delete updates.createdAt;
    delete updates.subscription;

    updates.updatedAt = new Date().toISOString();

    await db.collection('users').doc(uid).update(updates);

    res.json({ 
      success: true, 
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user account
router.delete('/account', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;

    // Delete user from Firebase Auth
    await auth.deleteUser(uid);

    // Delete user document from Firestore
    await db.collection('users').doc(uid).delete();

    res.json({ 
      success: true, 
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PAYMENT-FIRST PREMIUM ACCOUNT SYSTEM =====

const paymentVerificationService = require('../services/paymentVerificationService');

/**
 * Step 1: Verify payment and create premium account
 * POST /api/auth/create-premium-account
 * Body: { email, password, receipt, platform }
 */
router.post('/create-premium-account', async (req, res) => {
  try {
    const { email, password, receipt, platform } = req.body;

    if (!email || !password || !receipt || !platform) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'receipt', 'platform']
      });
    }

    console.log('🛒 Processing premium account creation for:', email);

    // Step 1: Verify payment first
    let paymentVerification;
    
    if (platform === 'ios') {
      paymentVerification = await paymentVerificationService.verifyAppleReceipt(receipt);
    } else if (platform === 'android') {
      const { packageName, productId, purchaseToken } = receipt;
      paymentVerification = await paymentVerificationService.verifyGooglePurchase(
        packageName, 
        productId, 
        purchaseToken
      );
    } else {
      return res.status(400).json({
        error: 'Invalid platform',
        supported: ['ios', 'android']
      });
    }

    if (!paymentVerification.valid) {
      console.log('❌ Payment verification failed for:', email);
      return res.status(402).json({
        error: 'Payment verification failed',
        details: paymentVerification.error,
        message: 'Please complete your purchase first'
      });
    }

    console.log('✅ Payment verified for:', email, 'Transaction:', paymentVerification.transactionId);

    // Step 2: Create Firebase account only after payment verification
    const accountResult = await paymentVerificationService.createPremiumAccount(
      email, 
      password, 
      paymentVerification
    );

    if (!accountResult.success) {
      return res.status(500).json({
        error: 'Failed to create account',
        message: 'Payment verified but account creation failed. Please contact support.'
      });
    }

    // Step 3: Return success with account details
    res.status(201).json({
      success: true,
      message: 'Premium account created successfully',
      user: accountResult.user,
      courseStatus: {
        limit: accountResult.courseTracking.limit,
        remaining: accountResult.courseTracking.remaining,
        userType: 'premium'
      },
      nextSteps: [
        'Please verify your email address',
        'You can now sign in to your premium account',
        'Enjoy 50 courses per month!'
      ]
    });

  } catch (error) {
    console.error('❌ Premium account creation failed:', error);
    
    // Determine appropriate error response
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'This email is already registered. Please sign in instead.',
        action: 'signin'
      });
    }

    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address.'
      });
    }

    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password should be at least 6 characters long.'
      });
    }

    res.status(500).json({
      error: 'Account creation failed',
      message: 'An unexpected error occurred. Please try again.',
      details: error.message
    });
  }
});

/**
 * Step 2: Sign in with existing credentials
 * POST /api/auth/signin-premium
 * Body: { email, idToken }
 */
router.post('/signin-premium', async (req, res) => {
  try {
    const { email, idToken } = req.body;

    if (!email || !idToken) {
      return res.status(400).json({
        error: 'Missing credentials',
        required: ['email', 'idToken']
      });
    }

    console.log('🔐 Processing premium sign in for:', email);

    // Verify user exists in Firebase and credentials are valid
    const loginResult = await paymentVerificationService.verifyUserLogin(email, idToken);

    if (!loginResult.valid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials or user not found',
        details: loginResult.error
      });
    }

    if (loginResult.user.disabled) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.'
      });
    }

    // Check subscription status
    const subscriptionStatus = await paymentVerificationService.checkSubscriptionStatus(
      loginResult.user.uid
    );

    console.log('✅ Premium user signed in successfully:', email);

    res.json({
      success: true,
      message: 'Premium sign in successful',
      user: {
        ...loginResult.user,
        subscription: subscriptionStatus
      },
      courseStatus: loginResult.courseStatus,
      warnings: !loginResult.user.emailVerified ? ['Please verify your email address'] : []
    });

  } catch (error) {
    console.error('❌ Premium sign in failed:', error);
    
    res.status(500).json({
      error: 'Sign in failed',
      message: 'An unexpected error occurred during sign in.',
      details: error.message
    });
  }
});

/**
 * Get user subscription status
 * GET /api/auth/subscription-status
 * Headers: Authorization: Bearer <firebase-id-token>
 */
router.get('/subscription-status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No authorization token provided'
      });
    }

    const idToken = authHeader.split(' ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    const subscriptionStatus = await paymentVerificationService.checkSubscriptionStatus(
      decodedToken.uid
    );

    res.json({
      success: true,
      subscription: subscriptionStatus,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      }
    });

  } catch (error) {
    console.error('❌ Failed to get subscription status:', error);
    res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
});

// Register anonymous user (for startup flow Path 2)
router.post('/register-anonymous', async (req, res) => {
  try {
    const { uid, userType, coursesGenerated, monthlyLimit } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('👤 Registering anonymous user:', uid);

    // Add user to course count service
    const courseCountService = require('../services/courseCountService');
    const userRecord = await courseCountService.createUserRecord(uid, userType || 'anonymous', coursesGenerated || 0);

    console.log('✅ Anonymous user registered successfully:', uid);
    res.json('Anonymous user registered successfully');
  } catch (error) {
    console.error('❌ Error registering anonymous user:', error);
    res.status(500).json({ error: 'Failed to register anonymous user' });
  }
});

// Verify if device hash exists in the system (for device hash approach)
router.post('/verify-device', async (req, res) => {
  try {
    const { deviceHash } = req.body;

    if (!deviceHash) {
      return res.status(400).json({ error: 'Device hash is required' });
    }

    console.log('🔍 Verifying device hash existence:', deviceHash.substring(0, 15) + '...');

    // Check if device hash exists in course counts
    const courseCountService = require('../services/courseCountService');
    const deviceExists = await courseCountService.userExists(deviceHash);

    if (deviceExists) {
      console.log('✅ Device hash verified successfully:', deviceHash.substring(0, 15) + '...');
      res.json({ 
        success: true, 
        message: 'Device hash verified successfully',
        deviceHash: deviceHash
      });
    } else {
      console.log('❌ Device hash not found in system:', deviceHash.substring(0, 15) + '...');
      res.status(404).json({ 
        error: 'Device hash not found',
        deviceHash: deviceHash
      });
    }
  } catch (error) {
    console.error('❌ Error verifying device hash:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize device hash - register if new, return course count if existing
router.post('/initialize-device', async (req, res) => {
  try {
    const { deviceHash } = req.body;

    if (!deviceHash) {
      return res.status(400).json({ error: 'Device hash is required' });
    }

    console.log('� Initializing device hash:', deviceHash.substring(0, 20) + '...');

    const courseCountService = require('../services/courseCountService');
    
    // Check if device hash already exists
    const deviceExists = await courseCountService.userExists(deviceHash);

    if (deviceExists) {
      // Device exists - fetch and return current course count
      console.log('✅ Device hash already exists, fetching course count...');
      const userData = await courseCountService.getUserData(deviceHash);
      
      res.json({ 
        success: true,
        message: 'Device hash found',
        deviceHash: deviceHash,
        isNew: false,
        courseCount: userData.count || 0,
        userType: userData.userType || 'anonymous',
        createdAt: userData.createdAt
      });
    } else {
      // Device doesn't exist - create new record
      console.log('🆕 New device hash detected, creating record...');
      await courseCountService.createUserRecord(deviceHash, 'anonymous');
      
      res.json({ 
        success: true,
        message: 'Device hash registered successfully',
        deviceHash: deviceHash,
        isNew: true,
        courseCount: 0,
        userType: 'anonymous',
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error initializing device hash:', error);
    res.status(500).json({ error: 'Failed to initialize device hash' });
  }
});

// Verify if user exists in the system (for startup flow) - LEGACY FIREBASE APPROACH
router.post('/verify-user', async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('🔍 Verifying user existence for UID:', uid);

    // First check if user exists in Firebase (source of truth)
    try {
      const firebaseUser = await auth.getUser(uid);
      console.log('✅ User exists in Firebase:', uid);
      
      // Now check if user exists in backend
      const courseCountService = require('../services/courseCountService');
      const userExistsInBackend = await courseCountService.userExists(uid);
      
      if (userExistsInBackend) {
        console.log('✅ User exists in both Firebase and backend');
        res.json({ 
          success: true, 
          message: 'User verified successfully',
          uid: uid,
          status: 'verified'
        });
      } else {
        console.log('⚠️ User exists in Firebase but not in backend, adding to backend...');
        
        try {
          // Add user to backend with default values
          await courseCountService.createUserRecord(uid, 'anonymous');
          
          console.log('✅ User added to backend successfully:', uid);
          res.json({ 
            success: true, 
            message: 'User verified and added to backend',
            uid: uid,
            status: 'synced'
          });
        } catch (backendError) {
          console.error('❌ Failed to add user to backend:', backendError);
          res.status(500).json({ 
            error: 'Failed to sync user with backend',
            uid: uid
          });
        }
      }
      
    } catch (firebaseError) {
      // User doesn't exist in Firebase - this means they should sign up
      console.log('❌ User does not exist in Firebase:', uid);
      console.log('🔄 User should be redirected to signup');
      
      res.status(404).json({ 
        error: 'User not found in Firebase',
        message: 'Please sign up to create an account',
        uid: uid,
        requiresSignup: true
      });
    }
  } catch (error) {
    console.error('❌ Error verifying user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create premium user after payment and Firebase account creation
router.post('/create-premium-user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const { email, paymentReceipt, subscriptionType, courseLimit, createdAt } = req.body;

    console.log('📊 Creating premium user in courseCounts.json:', { uid, email, subscriptionType });

    // Verify Apple receipt if provided
    let subscriptionInfo = null;
    if (paymentReceipt && paymentReceipt.receipt && paymentReceipt.platform === 'ios') {
      console.log('🧾 Verifying Apple receipt...');
      const receiptVerification = await receiptVerificationService.verifyAppleReceipt(
        paymentReceipt.receipt,
        paymentReceipt.productId
      );

      if (!receiptVerification.success) {
        console.error('❌ Receipt verification failed:', receiptVerification.error);
        return res.status(400).json({ 
          error: 'Receipt verification failed',
          message: receiptVerification.error
        });
      }

      subscriptionInfo = receiptVerification.subscription;
      console.log('✅ Apple receipt verified successfully');
    }

    // Initialize course count service
    const courseCountService = require('../services/courseCountService');

    // Create premium user record with higher course limits
    const userData = {
      uid: uid,
      email: email,
      accountType: 'premium',
      subscriptionType: subscriptionType || 'premium_monthly',
      paymentReceipt: paymentReceipt,
      subscriptionInfo: subscriptionInfo, // Verified subscription details
      coursesGenerated: 0,
      courseLimit: courseLimit || 50, // Premium users get 50 courses per month
      lastResetDate: new Date().toISOString(),
      createdAt: createdAt || new Date().toISOString(),
      isActive: true
    };

    // Store user in courseCounts.json
    await courseCountService.createPremiumUserRecord(uid, userData);

    // Also create user profile in Firestore for additional data
    const userProfile = {
      uid,
      email,
      accountType: 'premium',
      subscriptionType: subscriptionType || 'premium_monthly',
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subscription: {
        isActive: subscriptionInfo?.isActive || true,
        type: subscriptionType || 'premium_monthly',
        startDate: subscriptionInfo?.purchaseDate?.toISOString() || new Date().toISOString(),
        expiryDate: subscriptionInfo?.expirationDate?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        courseLimit: courseLimit || 50,
        transactionId: subscriptionInfo?.transactionId,
        originalTransactionId: subscriptionInfo?.originalTransactionId,
        autoRenew: subscriptionInfo?.autoRenewStatus || false
      }
    };

    await db.collection('users').doc(uid).set(userProfile, { merge: true });

    console.log('✅ Premium user created successfully:', uid);

    res.json({ 
      success: true, 
      message: 'Premium user created successfully',
      user: userProfile,
      courseStatus: {
        coursesGenerated: 0,
        courseLimit: courseLimit || 50,
        remainingCourses: courseLimit || 50
      },
      subscription: subscriptionInfo
    });

  } catch (error) {
    console.error('❌ Error creating premium user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check Apple configuration status (for debugging)
router.get('/apple-config-status', async (req, res) => {
  try {
    const status = receiptVerificationService.getConfigurationStatus();
    res.json({
      success: true,
      appleConfig: status
    });
  } catch (error) {
    console.error('❌ Error checking Apple config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
