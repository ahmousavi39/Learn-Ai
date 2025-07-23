const express = require('express');
const { db } = require('../config/firebase');
const { verifyAppleReceipt, verifyGooglePlayPurchase } = require('../services/receiptVerification');
const router = express.Router();

// Verify subscription purchase
router.post('/verify', async (req, res) => {
  try {
    const { receipt, purchaseToken, productId, platform } = req.body;

    if (!productId || !platform) {
      return res.status(400).json({ 
        success: false, 
        error: 'Product ID and platform are required' 
      });
    }

    let verificationResult;
    let purchaseData;

    if (platform === 'ios') {
      if (!receipt) {
        return res.status(400).json({ 
          success: false, 
          error: 'Receipt is required for iOS verification' 
        });
      }
      verificationResult = await verifyAppleReceipt(receipt);
    } else if (platform === 'android') {
      if (!purchaseToken) {
        return res.status(400).json({ 
          success: false, 
          error: 'Purchase token is required for Android verification' 
        });
      }
      verificationResult = await verifyGooglePlayPurchase(productId, purchaseToken);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported platform' 
      });
    }

    if (!verificationResult.isValid) {
      return res.json({ 
        success: false, 
        error: 'Purchase verification failed' 
      });
    }

    // Store subscription data
    purchaseData = verificationResult.purchaseData;
    const subscriptionDoc = {
      productId,
      platform,
      purchaseToken: purchaseToken || null,
      receipt: receipt || null,
      purchaseTime: purchaseData.purchaseTime || new Date().toISOString(),
      expiryTime: purchaseData.expiryTime,
      isActive: true,
      verificationTime: new Date().toISOString(),
      originalTransactionId: purchaseData.originalTransactionId || null,
      subscriptionId: purchaseData.subscriptionId || null
    };

    // Store in Firestore (you might want to associate with a user later)
    const subscriptionRef = await db.collection('subscriptions').add(subscriptionDoc);

    res.json({ 
      success: true, 
      subscriptionId: subscriptionRef.id,
      purchaseData: subscriptionDoc
    });

  } catch (error) {
    console.error('Subscription verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Verification service unavailable' 
    });
  }
});

// Link subscription to user account
router.post('/link-to-user', async (req, res) => {
  try {
    const { subscriptionId, uid } = req.body;

    if (!subscriptionId || !uid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subscription ID and User ID are required' 
      });
    }

    // Get subscription document
    const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();
    
    if (!subscriptionDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Subscription not found' 
      });
    }

    const subscriptionData = subscriptionDoc.data();

    // Update user document with subscription
    const userSubscription = {
      subscriptionId,
      productId: subscriptionData.productId,
      platform: subscriptionData.platform,
      isActive: subscriptionData.isActive,
      expiryDate: subscriptionData.expiryTime,
      linkedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).set({
      subscription: userSubscription,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Update subscription with user reference
    await db.collection('subscriptions').doc(subscriptionId).update({
      linkedUserId: uid,
      linkedAt: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      message: 'Subscription linked to user successfully',
      subscription: userSubscription
    });

  } catch (error) {
    console.error('Error linking subscription to user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Check subscription status for a product
router.post('/status', async (req, res) => {
  try {
    const { productId, purchaseToken, platform } = req.body;

    if (!productId || !platform) {
      return res.status(400).json({ 
        success: false, 
        error: 'Product ID and platform are required' 
      });
    }

    let statusResult;

    if (platform === 'android' && purchaseToken) {
      statusResult = await verifyGooglePlayPurchase(productId, purchaseToken);
    } else {
      // For iOS, you would typically check with App Store Server API
      return res.status(400).json({ 
        success: false, 
        error: 'Status check not implemented for this platform' 
      });
    }

    res.json({
      success: true,
      isActive: statusResult.isValid,
      purchaseData: statusResult.purchaseData
    });

  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Status check failed' 
    });
  }
});

// Get user's subscription history
router.get('/history/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const subscriptionsSnapshot = await db.collection('subscriptions')
      .where('linkedUserId', '==', uid)
      .orderBy('verificationTime', 'desc')
      .get();

    const subscriptions = [];
    subscriptionsSnapshot.forEach(doc => {
      subscriptions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      subscriptions
    });

  } catch (error) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch subscription history' 
    });
  }
});

// Update subscription status (for webhooks or manual updates)
router.put('/update-status', async (req, res) => {
  try {
    const { subscriptionId, isActive, expiryTime } = req.body;

    if (!subscriptionId || typeof isActive !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'Subscription ID and active status are required' 
      });
    }

    const updateData = {
      isActive,
      updatedAt: new Date().toISOString()
    };

    if (expiryTime) {
      updateData.expiryTime = expiryTime;
    }

    await db.collection('subscriptions').doc(subscriptionId).update(updateData);

    // Also update user's subscription status
    const subscriptionDoc = await db.collection('subscriptions').doc(subscriptionId).get();
    const subscriptionData = subscriptionDoc.data();

    if (subscriptionData.linkedUserId) {
      await db.collection('users').doc(subscriptionData.linkedUserId).update({
        'subscription.isActive': isActive,
        'subscription.expiryDate': expiryTime || subscriptionData.expiryTime,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ 
      success: true, 
      message: 'Subscription status updated successfully' 
    });

  } catch (error) {
    console.error('Error updating subscription status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update subscription status' 
    });
  }
});

module.exports = router;
