const { auth } = require('../config/firebase');
const courseCountService = require('./courseCountService');

class UserVerificationService {
  
  // Verify Firebase user and add to JSON tracking
  async verifyAndRegisterUser(token, userType = 'anonymous') {
    try {
      if (!auth) {
        throw new Error('Firebase Admin SDK not configured');
      }

      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(token);
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      console.log(`🔐 Verified Firebase user: ${uid.substring(0, 8)}... (${userType})`);

      // Determine user identifier based on type
      let userIdentifier;
      if (userType === 'premium' && email) {
        userIdentifier = email;
        console.log(`👑 Premium user verified with email: ${email}`);
      } else {
        userIdentifier = uid;
        userType = 'anonymous'; // Force anonymous if no email
        console.log(`👤 Anonymous user verified with UID: ${uid.substring(0, 8)}...`);
      }

      // Check if user already exists in JSON
      const data = await courseCountService.loadData();
      const userExists = data.users[userIdentifier];
      
      if (!userExists) {
        // New user - add to JSON tracking
        console.log(`📝 Registering new ${userType} user in course tracking system`);
        
        // Create user record with 0 courses
        await courseCountService.createUserRecord(userIdentifier, userType);
      } else {
        console.log(`✅ Existing ${userType} user found in tracking system: ${userExists.count} courses generated`);
      }

      return {
        verified: true,
        uid,
        email,
        userIdentifier,
        userType,
        decodedToken
      };

    } catch (error) {
      console.error('❌ User verification failed:', error);
      throw new Error(`User verification failed: ${error.message}`);
    }
  }

  // Verify user and check course generation eligibility
  async verifyAndCheckLimits(token, requestedUserType = 'anonymous') {
    try {
      // First verify the user with Firebase
      const verification = await this.verifyAndRegisterUser(token, requestedUserType);
      
      // Then check course generation limits
      const limitCheck = await courseCountService.canGenerateCourse(
        verification.userIdentifier, 
        verification.userType
      );

      return {
        verification,
        limits: limitCheck,
        canGenerate: limitCheck.canGenerate
      };

    } catch (error) {
      console.error('❌ User verification and limit check failed:', error);
      throw error;
    }
  }

  // Verify token without registration (for API calls)
  async verifyTokenOnly(token) {
    try {
      if (!auth) {
        throw new Error('Firebase Admin SDK not configured');
      }

      const decodedToken = await auth.verifyIdToken(token);
      return {
        verified: true,
        uid: decodedToken.uid,
        email: decodedToken.email,
        decodedToken
      };

    } catch (error) {
      console.error('❌ Token verification failed:', error);
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
}

module.exports = new UserVerificationService();
