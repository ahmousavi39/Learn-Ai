import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import courseService from '../../services/courseService';

interface SavedCoursesProps {
  visible: boolean;
  onClose: () => void;
  onSelectCourse: (course: any) => void;
}

const SavedCourses: React.FC<SavedCoursesProps> = ({
  visible,
  onClose,
  onSelectCourse,
}) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadCourses();
    }
  }, [visible, user]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const userCourses = await courseService.getUserCourses();
      setCourses(userCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      Alert.alert('Error', 'Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  };

  const handleDeleteCourse = (course: any) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${course.topic}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await courseService.deleteCourse(course.id);
              if (success) {
                setCourses(prev => prev.filter(c => c.id !== course.id));
                Alert.alert('Success', 'Course deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete course');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete course');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderCourseItem = ({ item }: { item: any }) => (
    <View style={styles.courseItem}>
      <TouchableOpacity
        style={styles.courseContent}
        onPress={() => onSelectCourse(item)}
      >
        <View style={styles.courseHeader}>
          <Text style={styles.courseTitle} numberOfLines={2}>
            {item.topic}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteCourse(item)}
          >
            <FontAwesome name="trash" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.courseDetails}>
          <View style={styles.detailItem}>
            <FontAwesome name="signal" size={12} color="#666" />
            <Text style={styles.detailText}>Level {item.level}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <FontAwesome name="clock-o" size={12} color="#666" />
            <Text style={styles.detailText}>{item.timeAllocated} min</Text>
          </View>
          
          <View style={styles.detailItem}>
            <FontAwesome name="globe" size={12} color="#666" />
            <Text style={styles.detailText}>{item.language}</Text>
          </View>
        </View>
        
        <View style={styles.courseMeta}>
          <Text style={styles.sectionCount}>
            {item.sections?.length || 0} sections
          </Text>
          <Text style={styles.createdDate}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Saved Courses</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <FontAwesome name="times" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your courses...</Text>
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="graduation-cap" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Saved Courses</Text>
          <Text style={styles.emptyText}>
            Your generated courses will appear here when you're signed in
          </Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    padding: 15,
  },
  courseItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseContent: {
    padding: 20,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  deleteButton: {
    padding: 5,
  },
  courseDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  courseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default SavedCourses;
