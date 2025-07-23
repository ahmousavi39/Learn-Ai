const express = require('express');
const { auth, db } = require('../config/firebase');
const router = express.Router();

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

module.exports = router;
