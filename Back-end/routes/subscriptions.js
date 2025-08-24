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
      subscriptionId: purchaseData.subscriptionId || null,
      isMockPurchase: purchaseData.isMockPurchase || false,
      // Add a flag to indicate this subscription is verified but not yet linked to a user
      awaitingUserLink: true
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

// New endpoint: Process payment-first flow
router.post('/process-payment-first', async (req, res) => {
  try {
    const { receipt, purchaseToken, productId, platform, userEmail } = req.body;

    if (!productId || !platform) {
      return res.status(400).json({ 
        success: false, 
        error: 'Product ID and platform are required' 
      });
    }

    let verificationResult;

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

    // Create a temporary subscription record that can be claimed during account creation
    const purchaseData = verificationResult.purchaseData;
    const tempSubscriptionDoc = {
      productId,
      platform,
      purchaseToken: purchaseToken || null,
      receipt: receipt || null,
      purchaseTime: purchaseData.purchaseTime || new Date().toISOString(),
      expiryTime: purchaseData.expiryTime,
      isActive: true,
      verificationTime: new Date().toISOString(),
      originalTransactionId: purchaseData.originalTransactionId || null,
      subscriptionId: purchaseData.subscriptionId || null,
      isMockPurchase: purchaseData.isMockPurchase || false,
      // This subscription is verified and ready to be linked to an account
      awaitingUserLink: true,
      // Optional: store user email for verification during account creation
      associatedEmail: userEmail || null,
      // Set expiration for this temporary record (1 hour)
      linkExpirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };

    const subscriptionRef = await db.collection('temp_subscriptions').add(tempSubscriptionDoc);
    
    // Return a verification token that can be used during account creation
    const verificationToken = Buffer.from(JSON.stringify({
      subscriptionId: subscriptionRef.id,
      productId,
      timestamp: Date.now()
    })).toString('base64');

    res.json({ 
      success: true, 
      verificationToken,
      message: 'Payment verified successfully. Use this token to complete account creation.'
    });

  } catch (error) {
    console.error('Payment-first processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Payment processing failed' 
    });
  }
});

// New endpoint: Claim verified subscription with user account
router.post('/claim-subscription', async (req, res) => {
  try {
    const { verificationToken, uid, email } = req.body;

    if (!verificationToken || !uid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification token and user ID are required' 
      });
    }

    // Decode the verification token
    let tokenData;
    try {
      const decodedToken = Buffer.from(verificationToken, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedToken);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid verification token' 
      });
    }

    const { subscriptionId, productId, timestamp } = tokenData;

    // Check if token is not too old (1 hour expiration)
    if (Date.now() - timestamp > 60 * 60 * 1000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification token has expired' 
      });
    }

    // Get the temporary subscription
    const tempSubscriptionDoc = await db.collection('temp_subscriptions').doc(subscriptionId).get();
    
    if (!tempSubscriptionDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Subscription not found or already claimed' 
      });
    }

    const tempSubscriptionData = tempSubscriptionDoc.data();

    // Check if already linked
    if (!tempSubscriptionData.awaitingUserLink) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subscription has already been claimed' 
      });
    }

    // Create the permanent subscription record
    const subscriptionDoc = {
      ...tempSubscriptionData,
      linkedUserId: uid,
      linkedAt: new Date().toISOString(),
      awaitingUserLink: false,
      userEmail: email
    };

    // Move to permanent subscriptions collection
    const permanentSubscriptionRef = await db.collection('subscriptions').add(subscriptionDoc);

    // Update user document with subscription
    const userSubscription = {
      subscriptionId: permanentSubscriptionRef.id,
      productId: tempSubscriptionData.productId,
      platform: tempSubscriptionData.platform,
      isActive: tempSubscriptionData.isActive,
      expiryDate: tempSubscriptionData.expiryTime,
      linkedAt: new Date().toISOString(),
      isMockPurchase: tempSubscriptionData.isMockPurchase || false
    };

    await db.collection('users').doc(uid).set({
      subscription: userSubscription,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Delete the temporary subscription
    await db.collection('temp_subscriptions').doc(subscriptionId).delete();

    res.json({ 
      success: true, 
      message: 'Subscription claimed successfully',
      subscription: userSubscription
    });

  } catch (error) {
    console.error('Error claiming subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to claim subscription' 
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
