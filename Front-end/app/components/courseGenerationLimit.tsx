import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import courseService from '../../services/courseService';
import SubscriptionScreen from './subscriptionScreen';
import APP_CONFIG from '../../config/appConfig';

interface CourseGenerationLimitProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

const CourseGenerationLimit: React.FC<CourseGenerationLimitProps> = ({
  visible,
  onClose,
  onSubscribe,
}) => {
  const { user } = useAuth();
  const [showSubscription, setShowSubscription] = useState(false);
  const [limits, setLimits] = useState({
    coursesGenerated: 0,
    limit: APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT,
    remaining: APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT,
    canGenerate: true
  });

  useEffect(() => {
    if (visible && !user) {
      checkLimits();
    }
  }, [visible, user]);

  const checkLimits = async () => {
    try {
      const limitData = await courseService.checkCourseGenerationLimits();
      setLimits(limitData);
    } catch (error) {
      console.error('Error checking limits:', error);
    }
  };

  const handleSubscribe = () => {
    setShowSubscription(true);
  };

  const handleSubscriptionSuccess = () => {
    setShowSubscription(false);
    onSubscribe();
    onClose();
  };

  if (showSubscription) {
    return (
      <SubscriptionScreen
        onSubscriptionSuccess={handleSubscriptionSuccess}
        onSkip={() => setShowSubscription(false)}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome name="times" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <FontAwesome name="graduation-cap" size={60} color="#007AFF" />
          </View>

          <Text style={styles.title}>Free Course Limit Reached</Text>
          
          <Text style={styles.subtitle}>
            You've used {limits.coursesGenerated} of {limits.limit} free courses today
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(limits.coursesGenerated / limits.limit) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {limits.coursesGenerated}/{limits.limit} courses used
            </Text>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Upgrade to Premium for:</Text>
            {[
              'Unlimited course generation',
              'Save courses to your account',
              'Access courses across devices',
              'Advanced AI features',
              'Priority support'
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <FontAwesome name="check" size={16} color="#4CAF50" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterButton} onPress={onClose}>
            <Text style={styles.laterButtonText}>Maybe Later</Text>
          </TouchableOpacity>

          <Text style={styles.resetText}>
            Your free courses reset daily. Come back tomorrow for 2 more free courses!
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  closeButton: {
    padding: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#555',
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  laterButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  laterButtonText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  resetText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default CourseGenerationLimit;
