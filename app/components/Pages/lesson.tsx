import React, { useEffect, useState } from 'react';
import { selectCourses, lessonDone, openLocation } from '../../../features/item/itemSlice';
import { useAppDispatch, useAppSelector } from '../../hook';
import {
  SafeAreaProvider,
  SafeAreaView
} from 'react-native-safe-area-context';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Pressable
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function Lesson({ route, navigation }) {
  const dispatch = useAppDispatch();
  const courses = useAppSelector(selectCourses);
  const [content, setContent] = useState({ title: '', bulletpoint: [], image: '', id: 0, isDone: false });

  const { courseId, sectionIndex, contentIndex } = route.params || {};
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    const course = courses.find(course => course.id === courseId);
    if (course) {
      const section = course.sections[sectionIndex];
      if (section) {
        setContent(section.content[contentIndex]);
      }
    }
  }, [courses, courseId, sectionIndex, contentIndex]);

  // Handler for Next button
  const goToNext = () => {
    dispatch(lessonDone({ courseId, sectionIndex, contentIndex }));
    const course = courses.find(course => course.id === courseId);
    if (!course) return;

    const section = course.sections[sectionIndex];
    if (!section) return;

    const nextContentIndex = contentIndex + 1;
    if (nextContentIndex < section.content.length) {
      dispatch(openLocation({ courseId, sectionIndex, contentIndex, isTest: false }))
      // Go to next content
      navigation.navigate('Lesson', {
        courseId,
        sectionIndex,
        contentIndex: nextContentIndex,
      });
    } else {
      // No more content, go to test if exists
      if (section.test && section.test.length > 0) {
        dispatch(openLocation({ courseId, sectionIndex, contentIndex, isTest: true }))
        navigation.navigate('Test', { questions: section.test, courseId, sectionIndex });
      } else {
        // If no test, maybe go back or somewhere else
        dispatch(openLocation({ courseId, sectionIndex: sectionIndex+1, contentIndex: null, isTest: true }))
        navigation.goBack();
      }
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          {content.image ? (
            <Image
              source={{ uri: content.image }}
              style={[styles.image, { width: screenWidth - 40 }]}
              resizeMode="cover"
            />
          ) : null}

          <Text style={styles.title}>{content.title}</Text>

          <View style={styles.textBlock}>
            {content.bulletpoint.map((text, index) => (
              <View key={index} style={styles.bulletContainer}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <Pressable style={styles.nextButton} onPress={goToNext}>
          <MaterialIcons name="navigate-next" size={36} color="#3730a3" />
        </Pressable>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  container: {
    paddingHorizontal: 10,
    paddingBottom: 80, // space for button
  },
  image: {
    height: 220,
    borderRadius: 14,
    marginBottom: 28,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: '#222',
  },
  textBlock: {
    gap: 12,
  },
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 20,
    lineHeight: 24,
    marginRight: 10,
    color: '#333',
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  nextButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: 'transparent',
  },
});
