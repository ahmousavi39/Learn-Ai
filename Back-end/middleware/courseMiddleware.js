const { auth, db } = require('../config/firebase');

// Middleware to verify Firebase ID token (optional for course generation)
const verifyTokenOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ') && auth) {
      const token = authHeader.split(' ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
      
      // Get user data from Firestore if available
      if (db) {
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists) {
          req.userData = userDoc.data();
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    // Continue without user data for guests
    next();
  }
};

// Check if user has valid subscription or within free limit
const checkCourseGenerationLimit = async (req, res, next) => {
  try {
    // If Firebase is not configured, allow unlimited generation for development
    if (!db) {
      console.log('🔧 Firebase not configured - allowing unlimited course generation for development');
      return next();
    }

    if (!req.user) {
      // Guest user - check course generation limit by IP or device
      const guestId = req.headers['x-guest-id'] || req.ip;
      const guestDoc = await db.collection('guests').doc(guestId).get();
      
      let guestData = { coursesGenerated: 0, lastReset: new Date().toISOString() };
      
      if (guestDoc.exists) {
        guestData = guestDoc.data();
        
        // Reset counter if it's a new day
        const lastReset = new Date(guestData.lastReset);
        const now = new Date();
        const daysDiff = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 1) {
          guestData.coursesGenerated = 0;
          guestData.lastReset = now.toISOString();
        }
      }
      
      if (guestData.coursesGenerated >= 2) {
        return res.status(403).json({
          error: 'Free course generation limit reached',
          message: 'You have reached the limit of 2 free courses. Please subscribe to generate unlimited courses.',
          isLimitReached: true,
          coursesGenerated: guestData.coursesGenerated,
          limit: 2
        });
      }
      
      req.guestData = guestData;
      req.guestId = guestId;
      
    } else {
      // Authenticated user - check subscription
      if (!req.userData || !req.userData.subscription || !req.userData.subscription.isActive) {
        return res.status(403).json({
          error: 'No active subscription',
          message: 'An active subscription is required to generate courses. Please subscribe to continue.',
          requiresSubscription: true
        });
      }
      
      // Check if subscription is expired
      const expiryDate = new Date(req.userData.subscription.expiryDate);
      if (expiryDate <= new Date()) {
        return res.status(403).json({
          error: 'Subscription expired',
          message: 'Your subscription has expired. Please renew to continue generating courses.',
          requiresSubscription: true
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error checking course generation limit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update course generation count for guests
const updateGuestCourseCount = async (guestId, guestData) => {
  try {
    if (!db) {
      console.log('🔧 Firebase not configured - skipping guest count update');
      return;
    }
    
    await db.collection('guests').doc(guestId).set({
      ...guestData,
      coursesGenerated: guestData.coursesGenerated + 1,
      lastGenerated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating guest course count:', error);
  }
};

// Save course to user's Firebase document
const saveCourseToUser = async (userId, courseData) => {
  try {
    if (!db) {
      console.log('🔧 Firebase not configured - skipping course save');
      return null;
    }
    
    const courseRef = await db.collection('courses').add({
      ...courseData,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Also update user's course list
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      'stats.totalCourses': db.FieldValue.increment(1),
      'stats.lastCourseGenerated': new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return courseRef.id;
  } catch (error) {
    console.error('Error saving course to user:', error);
    throw error;
  }
};

module.exports = {
  verifyTokenOptional,
  checkCourseGenerationLimit,
  updateGuestCourseCount,
  saveCourseToUser
};
