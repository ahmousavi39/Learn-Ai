import AsyncStorage from '@react-native-async-storage/async-storage';

export const putItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    
    // Enhanced logging for different types of data
    if (key === 'courses') {
      console.log(`💾 📚 COURSES STORED IN ASYNCSTORAGE:`);
      console.log(`   - Total courses: ${value?.length || 0}`);
      value?.forEach((course, index) => {
        console.log(`   - ${index + 1}. "${course.name}" (${course.language}, Level ${course.level})`);
      });
    } else if (key === 'coursesList') {
      console.log(`💾 📋 COURSE LIST STORED IN ASYNCSTORAGE:`);
      console.log(`   - Total items: ${value?.length || 0}`);
      value?.forEach((item, index) => {
        console.log(`   - ${index + 1}. "${item.name}" (ID: ${item.id})`);
      });
    } else if (key === 'anonymous_user_data') {
      console.log(`💾 👤 ANONYMOUS USER DATA STORED: UID ${value?.uid?.substring(0, 8)}..., ${value?.coursesGenerated} courses`);
    } else if (key === 'guestId') {
      console.log(`💾 🆔 GUEST ID STORED: ${value}`);
    } else if (key.startsWith('courseCount_')) {
      console.log(`💾 🔢 COURSE COUNT STORED: ${key} = ${value}`);
    } else if (key.startsWith('device_courses_')) {
      console.log(`💾 📱 DEVICE COURSE COUNT STORED: ${key} = ${value}`);
    } else {
      console.log(`💾 AsyncStorage PUT: ${key}`, JSON.stringify(value, null, 2));
    }
  } catch (error) {
    console.error('Error setting item:', error);
  }
};

export const getItem = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    const parsedValue = value != null ? JSON.parse(value) : null;
    
    // Enhanced logging for different types of data
    if (key === 'courses' && parsedValue) {
      console.log(`📖 📚 COURSES RETRIEVED FROM ASYNCSTORAGE: ${parsedValue.length} courses`);
    } else if (key === 'coursesList' && parsedValue) {
      console.log(`📖 📋 COURSE LIST RETRIEVED FROM ASYNCSTORAGE: ${parsedValue.length} items`);
    } else if (key === 'anonymous_user_data' && parsedValue) {
      console.log(`📖 👤 ANONYMOUS USER DATA RETRIEVED: UID ${parsedValue?.uid?.substring(0, 8)}..., ${parsedValue?.coursesGenerated} courses`);
    } else if (key === 'guestId' && parsedValue) {
      console.log(`📖 🆔 GUEST ID RETRIEVED: ${parsedValue}`);
    } else if (key.startsWith('courseCount_')) {
      console.log(`📖 🔢 COURSE COUNT RETRIEVED: ${key} = ${parsedValue}`);
    } else if (key.startsWith('device_courses_')) {
      console.log(`📖 📱 DEVICE COURSE COUNT RETRIEVED: ${key} = ${parsedValue}`);
    } else {
      console.log(`📖 AsyncStorage GET: ${key}`, parsedValue);
    }
    
    return parsedValue;
  } catch (error) {
    console.error('Error getting item:', error);
    return null;
  }
};

export const removeItem = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    
    // Enhanced logging for different types of data
    if (key === 'courses') {
      console.log(`🗑️ 📚 ALL COURSES REMOVED FROM ASYNCSTORAGE`);
    } else if (key === 'coursesList') {
      console.log(`🗑️ 📋 COURSE LIST REMOVED FROM ASYNCSTORAGE`);
    } else if (key.startsWith('courseCount_')) {
      console.log(`🗑️ 🔢 COURSE COUNT REMOVED: ${key}`);
    } else if (key.startsWith('device_courses_')) {
      console.log(`🗑️ 📱 DEVICE COURSE COUNT REMOVED: ${key}`);
    } else {
      console.log(`🗑️ AsyncStorage REMOVE: ${key}`);
    }
  } catch (error) {
    console.error('Error removing item:', error);
  }
};

export const mergeItem = async (key, value) => {
  try {
    await AsyncStorage.mergeItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error merging item:', error);
  }
};

export const clear = async () => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing AsyncStorage:', error);
  }
};

export const getAllKeys = async () => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('Error getting all keys:', error);
    return [];
  }
};
