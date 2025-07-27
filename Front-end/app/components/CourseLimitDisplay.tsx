import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../theme';
import { APP_CONFIG } from '../../config/appConfig';

interface CourseLimitDisplayProps {
  onSubscribe?: () => void;
  style?: any;
}

export const CourseLimitDisplay: React.FC<CourseLimitDisplayProps> = ({ 
  onSubscribe, 
  style 
}) => {
  const { courseGenerationStatus, localUserData, syncWithBackend } = useAuth();
  const { theme } = useTheme();

  const handleSyncPress = async () => {
    try {
      await syncWithBackend();
      Alert.alert('✅ Synced', 'Course limits have been synced with server');
    } catch (error) {
      Alert.alert('❌ Sync Failed', 'Could not sync with server. Using local data.');
    }
  };

  const handleSubscribePress = () => {
    if (onSubscribe) {
      onSubscribe();
    } else {
      Alert.alert(
        '🚀 Upgrade to Premium',
        'Get 50 courses per month and unlimited access to all features!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => console.log('Navigate to subscription') }
        ]
      );
    }
  };

  if (!courseGenerationStatus || !localUserData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card }, style]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Loading course limits...
        </Text>
      </View>
    );
  }

  const isLimitReached = courseGenerationStatus.isLimitReached;
  const isAnonymous = localUserData.userType === 'anonymous';
  
  // Get the monthly limit from config
  const monthlyLimit = localUserData.userType === 'premium' 
    ? APP_CONFIG.COURSE_LIMITS.PREMIUM_USER_MONTHLY_LIMIT 
    : APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT;

  return (
    <View style={[styles.container, { backgroundColor: theme.card }, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Course Generation Limits
        </Text>
        <TouchableOpacity onPress={handleSyncPress} style={styles.syncButton}>
          <Text style={[styles.syncText, { color: theme.primary }]}>
            🔄 Sync
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, { color: theme.text }]}>
          {localUserData.userType === 'premium' ? '👑 Premium' : '👤 Free'} Account
        </Text>
        
        <Text style={[styles.countText, { color: theme.text }]}>
          {localUserData.courseCount} / {monthlyLimit} courses used
        </Text>

        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: isLimitReached ? theme.error : theme.primary,
                width: `${(localUserData.courseCount / monthlyLimit) * 100}%`
              }
            ]} 
          />
        </View>

        <Text style={[styles.remainingText, { color: theme.inputText }]}>
          {courseGenerationStatus.remainingCourses} courses remaining
        </Text>
      </View>

      {isLimitReached && (
        <View style={[styles.warningContainer, { backgroundColor: theme.disBackground }]}>
          <Text style={[styles.warningTitle, { color: theme.error }]}>
            ⚠️ Limit Reached
          </Text>
          <Text style={[styles.warningText, { color: theme.error }]}>
            You've reached your monthly course generation limit.
          </Text>
          
          {isAnonymous && (
            <>
              <Text style={[styles.warningText, { color: theme.error }]}>
                Upgrade to Premium for 50 courses per month!
              </Text>
              <TouchableOpacity 
                style={[styles.subscribeButton, { backgroundColor: theme.primary }]}
                onPress={handleSubscribePress}
              >
                <Text style={[styles.subscribeButtonText, { color: theme.background }]}>
                  🚀 Upgrade to Premium
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {courseGenerationStatus.resetDate && (
        <Text style={[styles.resetText, { color: theme.inputText }]}>
          Limits reset on: {new Date(courseGenerationStatus.resetDate).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  syncButton: {
    padding: 8,
  },
  syncText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  countText: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 12,
  },
  warningContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    marginBottom: 8,
  },
  subscribeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetText: {
    fontSize: 12,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CourseLimitDisplay;
