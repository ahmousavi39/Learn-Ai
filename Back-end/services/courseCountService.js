const fs = require('fs').promises;
const path = require('path');
const CONFIG = require('../config/appConfig');

const COURSE_COUNTS_FILE = path.join(__dirname, '../data/courseCounts.json');

class CourseCountService {
  constructor() {
    this.ensureDataFile();
  }

  // Ensure the JSON file exists
  async ensureDataFile() {
    try {
      await fs.access(COURSE_COUNTS_FILE);
    } catch (error) {
      // File doesn't exist, create it
      const initialData = {
        users: {},
        lastUpdated: new Date().toISOString(),
        metadata: {
          totalUsers: 0,
          totalCourses: 0,
          version: "1.0.0"
        }
      };
      await this.saveData(initialData);
      console.log('📁 Created course counts data file');
    }
  }

  // Read data from JSON file
  async loadData() {
    try {
      const data = await fs.readFile(COURSE_COUNTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading course counts:', error);
      return { users: {}, lastUpdated: new Date().toISOString(), metadata: { totalUsers: 0, totalCourses: 0 } };
    }
  }

  // Save data to JSON file
  async saveData(data) {
    try {
      console.log(`💾 Saving course counts data to ${COURSE_COUNTS_FILE}...`);
      console.log(`📊 Saving data: ${data.metadata.totalUsers} users, ${data.metadata.totalCourses} courses`);
      
      data.lastUpdated = new Date().toISOString();
      await fs.writeFile(COURSE_COUNTS_FILE, JSON.stringify(data, null, 2));
      
      console.log(`✅ Course counts data saved successfully`);
    } catch (error) {
      console.error('❌ Error saving course counts:', error);
      throw error;
    }
  }

  // Get identifier for user (UID for anonymous, email for premium)
  getUserIdentifier(user, userType = 'anonymous') {
    if (userType === 'premium' && user.email) {
      return user.email;
    }
    return user.uid; // Default to UID for anonymous users
  }

  // Get course count for a user
  async getCourseCount(userIdentifier) {
    try {
      const data = await this.loadData();
      const userRecord = data.users[userIdentifier];
      
      if (!userRecord) {
        return {
          count: 0,
          firstCourse: null,
          lastCourse: null,
          userType: 'anonymous'
        };
      }

      // Check if it's a new month (reset count)
      const lastCourse = new Date(userRecord.lastCourse || 0);
      const now = new Date();
      const isNewMonth = lastCourse.getMonth() !== now.getMonth() || 
                        lastCourse.getFullYear() !== now.getFullYear();

      if (isNewMonth && userRecord.count > 0) {
        console.log(`🔄 Resetting monthly count for user: ${userIdentifier.substring(0, 8)}...`);
        userRecord.count = 0;
        userRecord.firstCourse = null;
        await this.saveData(data);
      }

      return {
        count: userRecord.count || 0,
        firstCourse: userRecord.firstCourse,
        lastCourse: userRecord.lastCourse,
        userType: userRecord.userType || 'anonymous'
      };
    } catch (error) {
      console.error('Error getting course count:', error);
      return { count: 0, firstCourse: null, lastCourse: null, userType: 'anonymous' };
    }
  }

  // Check if user exists in the system
  async userExists(userIdentifier) {
    try {
      console.log(`🔍 Checking if user exists: ${userIdentifier.substring(0, 8)}...`);
      
      const data = await this.loadData();
      const userExists = data.users.hasOwnProperty(userIdentifier);
      
      console.log(`👤 User ${userIdentifier.substring(0, 8)}... exists: ${userExists}`);
      return userExists;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }

  // Get user data from the system
  async getUserData(userIdentifier) {
    try {
      console.log(`📊 Getting user data for: ${userIdentifier.substring(0, 8)}...`);
      
      const data = await this.loadData();
      const userData = data.users[userIdentifier];
      
      if (userData) {
        console.log(`✅ User data found: ${userData.count} courses, type: ${userData.userType}`);
        return userData;
      } else {
        console.log(`❌ No user data found for: ${userIdentifier.substring(0, 8)}...`);
        return null;
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Increment course count for a user
  async incrementCourseCount(userIdentifier, userType = 'anonymous') {
    try {
      console.log(`🔢 Incrementing course count for ${userType} user: ${userIdentifier.substring(0, 8)}...`);
      
      const data = await this.loadData();
      const now = new Date().toISOString();

      if (!data.users[userIdentifier]) {
        console.log(`👤 Creating new user record for: ${userIdentifier.substring(0, 8)}...`);
        data.users[userIdentifier] = {
          count: 0,
          userType,
          firstCourse: null,
          lastCourse: null,
          createdAt: now
        };
        data.metadata.totalUsers++;
      }

      const userRecord = data.users[userIdentifier];
      
      // Check if it's a new month (reset count)
      const lastCourse = new Date(userRecord.lastCourse || 0);
      const nowDate = new Date();
      const isNewMonth = lastCourse.getMonth() !== nowDate.getMonth() || 
                        lastCourse.getFullYear() !== nowDate.getFullYear();

      if (isNewMonth && userRecord.count > 0) {
        console.log(`🔄 New month detected, resetting count for user: ${userIdentifier.substring(0, 8)}...`);
        userRecord.count = 0;
        userRecord.firstCourse = now;
      }

      // Increment count
      userRecord.count++;
      userRecord.lastCourse = now;
      userRecord.userType = userType; // Update user type in case it changed

      if (!userRecord.firstCourse) {
        userRecord.firstCourse = now;
      }

      data.metadata.totalCourses++;
      console.log(`📈 Incrementing total courses from ${data.metadata.totalCourses - 1} to ${data.metadata.totalCourses}`);
      
      await this.saveData(data);

      console.log(`✅ Course count updated for ${userIdentifier.substring(0, 8)}...: ${userRecord.count} (Total: ${data.metadata.totalCourses})`);
      console.log(`💾 Data saved to courseCounts.json`);
      
      return {
        count: userRecord.count,
        limit: userType === 'premium' ? CONFIG.COURSE_LIMITS.PREMIUM_USER_MONTHLY_LIMIT : CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT,
        remaining: userType === 'premium' ? 
          CONFIG.COURSE_LIMITS.PREMIUM_USER_MONTHLY_LIMIT - userRecord.count :
          CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT - userRecord.count
      };
    } catch (error) {
      console.error('Error incrementing course count:', error);
      throw error;
    }
  }

  // Create a new user record with specified course count (allows progress transfer)
  async createUserRecord(userIdentifier, userType = 'anonymous', initialCourseCount = 0) {
    try {
      console.log(`👤 Creating new user record for ${userType}: ${userIdentifier.substring(0, 8)}... with ${initialCourseCount} courses`);
      
      const data = await this.loadData();
      const now = new Date().toISOString();

      // Check if user already exists
      if (data.users[userIdentifier]) {
        console.log(`✅ User record already exists for: ${userIdentifier.substring(0, 8)}...`);
        return data.users[userIdentifier];
      }

      // Create new user record with specified course count
      data.users[userIdentifier] = {
        count: initialCourseCount, // Allow setting initial course count for progress transfer
        userType,
        firstCourse: null,
        lastCourse: null,
        createdAt: now
      };
      
      data.metadata.totalUsers++;
      // Recalculate total courses
      data.metadata.totalCourses = Object.values(data.users).reduce((total, user) => total + user.count, 0);
      
      await this.saveData(data);

      console.log(`✅ New user record created for ${userType}: ${userIdentifier.substring(0, 8)}... with ${initialCourseCount} courses (Total users: ${data.metadata.totalUsers})`);
      
      return data.users[userIdentifier];
    } catch (error) {
      console.error('Error creating user record:', error);
      throw error;
    }
  }

  // Check if user can generate more courses
  async canGenerateCourse(userIdentifier, userType = 'anonymous') {
    try {
      const courseData = await this.getCourseCount(userIdentifier);
      const limit = userType === 'premium' ? 
        CONFIG.COURSE_LIMITS.PREMIUM_USER_MONTHLY_LIMIT : 
        CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT;

      return {
        canGenerate: courseData.count < limit,
        count: courseData.count,
        limit,
        remaining: Math.max(0, limit - courseData.count),
        userType
      };
    } catch (error) {
      console.error('Error checking course generation limit:', error);
      return { canGenerate: false, count: 0, limit: 0, remaining: 0, userType };
    }
  }

  // Get statistics (optional, for admin)
  async getStatistics() {
    try {
      const data = await this.loadData();
      const users = Object.keys(data.users);
      const activeUsers = users.filter(uid => {
        const user = data.users[uid];
        const lastCourse = new Date(user.lastCourse || 0);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return lastCourse > thirtyDaysAgo;
      });

      return {
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        totalCourses: data.metadata.totalCourses,
        lastUpdated: data.lastUpdated
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return { totalUsers: 0, activeUsers: 0, totalCourses: 0, lastUpdated: null };
    }
  }
}

module.exports = new CourseCountService();
