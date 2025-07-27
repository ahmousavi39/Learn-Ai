const courseCountService = require('../services/courseCountService');

// Middleware to verify device hash and check course generation limits
const checkDeviceHashCourseLimit = async (req, res, next) => {
  try {
    console.log('🔍 Checking device hash course generation limit...');
    
    // Extract device hash from Authorization header or body
    let deviceHash = null;
    
    // Try Authorization header first (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      deviceHash = authHeader.split(' ')[1];
    }
    
    // Try request body as fallback
    if (!deviceHash && req.body && req.body.deviceHash) {
      deviceHash = req.body.deviceHash;
    }
    
    if (!deviceHash) {
      return res.status(401).json({ 
        error: 'Unauthorized - No device hash provided',
        needsAuth: true 
      });
    }

    console.log(`🔍 Verifying device hash: ${deviceHash.substring(0, 20)}...`);

    // Check if device exists in our system
    const deviceExists = await courseCountService.userExists(deviceHash);
    if (!deviceExists) {
      console.log(`❌ Device hash not found: ${deviceHash.substring(0, 20)}...`);
      return res.status(401).json({
        error: 'Device not registered',
        needsAuth: true
      });
    }

    // Get device data and check limits
    const deviceData = await courseCountService.getUserData(deviceHash);
    if (!deviceData) {
      return res.status(500).json({
        error: 'Failed to retrieve device data'
      });
    }

    // Get course limits based on user type
    const CONFIG = require('../config/appConfig');
    const monthlyLimit = deviceData.userType === 'premium' 
      ? CONFIG.COURSE_LIMITS.PREMIUM_USER_MONTHLY_LIMIT 
      : CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT;

    const remaining = Math.max(0, monthlyLimit - deviceData.count);
    const canGenerate = remaining > 0;

    if (!canGenerate) {
      console.log(`❌ Course limit reached for device: ${deviceData.count}/${monthlyLimit}`);
      return res.status(429).json({
        error: 'Course generation limit exceeded',
        message: `You have reached your monthly limit of ${monthlyLimit} courses. ${deviceData.userType === 'anonymous' ? 'Upgrade to premium for more courses.' : 'Your premium limit has been reached.'}`,
        coursesGenerated: deviceData.count,
        limit: monthlyLimit,
        remaining: remaining,
        userType: deviceData.userType
      });
    }

    console.log(`✅ Course generation allowed: ${deviceData.count}/${monthlyLimit} (${remaining} remaining)`);

    // Add device info to request for later use
    req.user = {
      userIdentifier: deviceHash,
      userType: deviceData.userType,
      deviceHash: deviceHash
    };

    req.courseCount = deviceData.count;

    next();

  } catch (error) {
    console.error('❌ Device hash course limit check failed:', error);
    
    return res.status(500).json({ 
      error: 'Course limit check failed',
      details: error.message 
    });
  }
};

module.exports = {
  checkDeviceHashCourseLimit
};
