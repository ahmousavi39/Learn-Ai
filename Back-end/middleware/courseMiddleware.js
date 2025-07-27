const userVerificationService = require('../services/userVerificationService');
const courseCountService = require('../services/courseCountService');

// Middleware to verify Firebase ID token and register/verify user
const verifyAndRegisterUser = async (req, res, next) => {
  try {
    console.log('🔍 Verifying and registering user...');
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized - No valid token provided',
        needsAuth: true 
      });
    }

    const token = authHeader.split(' ')[1];

    // Extract user type from request body (optional, defaults to anonymous)
    const requestedUserType = req.body?.userType || 'anonymous';

    // Verify user with Firebase and register in JSON if new
    const verification = await userVerificationService.verifyAndRegisterUser(token, requestedUserType);

    // Add verified user info to request
    req.user = {
      uid: verification.uid,
      email: verification.email,
      userIdentifier: verification.userIdentifier,
      userType: verification.userType,
      decodedToken: verification.decodedToken
    };

    console.log(`✅ User verified and registered: ${verification.userType} (${verification.userIdentifier.substring(0, 8)}...)`);
    next();

  } catch (error) {
    console.error('❌ User verification failed:', error);
    
    if (error.message.includes('Token expired') || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired - Please sign in again',
        needsAuth: true 
      });
    }
    
    if (error.message.includes('Invalid token') || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ 
        error: 'Invalid token - Please sign in again',
        needsAuth: true 
      });
    }

    return res.status(500).json({ 
      error: 'User verification failed',
      details: error.message 
    });
  }
};

// Check if user has valid subscription or within free limit using JSON storage
const checkCourseGenerationLimit = async (req, res, next) => {
  try {
    console.log('🔍 Checking course generation limit...');
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized - No valid token provided',
        needsAuth: true 
      });
    }

    const token = authHeader.split(' ')[1];

    // Extract user type from request body (optional)
    const requestedUserType = req.body?.userType || 'anonymous';

    // Verify user with Firebase and check limits
    const result = await userVerificationService.verifyAndCheckLimits(token, requestedUserType);

    if (!result.canGenerate) {
      console.log(`❌ Course limit reached for ${result.verification.userType}: ${result.limits.count}/${result.limits.limit}`);
      return res.status(429).json({
        error: 'Course generation limit exceeded',
        message: `You have reached your monthly limit of ${result.limits.limit} courses. ${result.verification.userType === 'anonymous' ? 'Upgrade to premium for more courses.' : 'Your premium limit has been reached.'}`,
        coursesGenerated: result.limits.count,
        limit: result.limits.limit,
        remaining: result.limits.remaining,
        userType: result.limits.userType,
        resetDate: result.limits.resetDate
      });
    }

    console.log(`✅ Course generation allowed: ${result.limits.count}/${result.limits.limit} (${result.limits.remaining} remaining)`);

    // Add user info to request for later use
    req.user = {
      uid: result.verification.uid,
      email: result.verification.email,
      userIdentifier: result.verification.userIdentifier,
      userType: result.verification.userType,
      decodedToken: result.verification.decodedToken
    };

    req.courseCount = result.limits.count;

    next();

  } catch (error) {
    console.error('❌ Course limit check failed:', error);
    
    if (error.message.includes('Token expired') || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired - Please sign in again',
        needsAuth: true 
      });
    }
    
    if (error.message.includes('Invalid token') || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ 
        error: 'Invalid token - Please sign in again',
        needsAuth: true 
      });
    }

    return res.status(500).json({ 
      error: 'Course limit check failed',
      details: error.message 
    });
  }
};

// Increment course count after successful generation
const incrementCourseCount = async (req, res, next) => {
  try {
    if (req.user && req.user.userIdentifier && req.user.userType) {
      await courseCountService.incrementCourseCount(req.user.userIdentifier, req.user.userType);
      console.log(`📈 Course count incremented for user: ${req.user.userIdentifier.substring(0, 8)}...`);
    }
    next();
  } catch (error) {
    console.error('Error incrementing course count:', error);
    // Don't fail the request, just log the error
    next();
  }
};

// Simple token verification middleware (without registration)
const verifyTokenOnly = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized - No valid token provided',
        needsAuth: true 
      });
    }

    const token = authHeader.split(' ')[1];
    const verification = await userVerificationService.verifyTokenOnly(token);

    req.user = {
      uid: verification.uid,
      email: verification.email,
      decodedToken: verification.decodedToken
    };

    next();

  } catch (error) {
    console.error('❌ Token verification failed:', error);
    
    if (error.message.includes('Token expired') || error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired - Please sign in again',
        needsAuth: true 
      });
    }
    
    if (error.message.includes('Invalid token') || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ 
        error: 'Invalid token - Please sign in again',
        needsAuth: true 
      });
    }

    return res.status(500).json({ 
      error: 'Token verification failed',
      details: error.message 
    });
  }
};

module.exports = {
  verifyAndRegisterUser,
  verifyTokenOnly,
  checkCourseGenerationLimit,
  incrementCourseCount
};
