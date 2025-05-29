import React, { useEffect, useState } from 'react';
import { selectCourses, lessonDone, openLocation, regenerateLesson } from '../../../features/item/itemSlice';
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
  Pressable,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function Lesson({ route, navigation }) {
  const dispatch = useAppDispatch();
  const courses = useAppSelector(selectCourses);
  const [content, setContent] = useState({ title: '', bulletpoints: [[]], image: '', id: 0, isDone: false });
  const [loading, setLoading] = useState(false);
  let level = "4/10";

  const { courseId, sectionIndex, contentIndex, language } = route.params || {};
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    const course = courses.find(course => course.id === courseId);
    if (course) {
      const section = course.sections[sectionIndex];
      level = course.level;
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
        language
      });
    } else {
      // No more content, go to test if exists
      if (section.test && section.test.length > 0) {
        dispatch(openLocation({ courseId, sectionIndex, contentIndex: null, isTest: true }))
        navigation.navigate('Test', { questions: section.test, courseId, sectionIndex });
      } else {
        // If no test, maybe go back or somewhere else
        dispatch(openLocation({ courseId, sectionIndex: sectionIndex + 1, contentIndex: null, isTest: true }));
        navigation.navigate('Course', { courseId, selectedSectionIndex: sectionIndex })
      }
    }
  };

  const goToPrevious = () => {
    const course = courses.find(course => course.id === courseId);
    if (!course) return;

    const section = course.sections[sectionIndex];
    if (!section) return;

    if (contentIndex > 0) {
      // Go to previous content in same section
      navigation.navigate('Lesson', {
        courseId,
        sectionIndex,
        contentIndex: contentIndex - 1,
      });
    } else {
      // First content of first section, just go back to course
      navigation.navigate('Course', {
        courseId,
        selectedSectionIndex: sectionIndex !== 0 ? sectionIndex - 1 : 0,
      });
    }
  };

  const reGenerate = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://learn-ai-w8ke.onrender.com/regenerate-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bulletpoints: content.bulletpoints, level, language }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const res = await response.json();

      if (res.newBulletpoints && Array.isArray(res.newBulletpoints)) {
        dispatch(regenerateLesson({ courseId, sectionIndex, contentIndex, newBulletpoints: res.newBulletpoints }))
      } else {
        throw new Error('Invalid sections data from server');
      }
    } catch (error) {
      console.error('Failed to generate lesson:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={loading ? styles.safeAreaDisabled : styles.safeArea}>
                  {loading && <ActivityIndicator size="large" color="#0000ff" />}
          {!loading && <>
        <ScrollView contentContainerStyle={styles.container}>
            {content.image ? (
              <Image
                source={{ uri: content.image }}
                style={[styles.image, { width: screenWidth - 40 }]}
                resizeMode="cover"
              />
            ) : null}
            <Text style={language === "fa" ? [styles.title, styles.persianText] : styles.title}>{content.title}</Text>

            <View style={styles.textBlock}>
              {content.bulletpoints.map((paragraphs, index) => (
                <>
                  {language === 'fa' ? (
                    <View key={index} style={styles.persianBulletContainer}>
                      <Text style={styles.persianBullet}>{'\u2013'}</Text>
                      <Text style={[styles.bulletText, styles.persianText]}>{paragraphs.map(text => <>{text}{'\n'}</>)}</Text>
                    </View>
                  ) : (
                    <View key={index} style={styles.bulletContainer}>
                      <Text style={styles.bullet}>{'\u2013'}</Text>
                      <Text style={styles.bulletText}>{paragraphs.map(text => <>{text}{'\n'}</>)}</Text>
                    </View>
                  )}
                </>

              ))}
            </View>
          
        </ScrollView>

        <Pressable style={styles.reGenerateTextButton} onPress={reGenerate}>
          <MaterialIcons name="refresh" size={36} color="orange" />
        </Pressable>
        <Pressable style={styles.nextButton} onPress={goToNext}>
          <MaterialIcons name="navigate-next" size={36} color="#3730a3" />
        </Pressable>

        <Pressable style={styles.backButton} onPress={goToPrevious}>
          <MaterialIcons name="navigate-before" size={36} color="#3730a3" />
        </Pressable>
      </>}
      </SafeAreaView>
    </SafeAreaProvider >
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f9f9f9',
  },
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 80
  },
  safeAreaDisabled: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: "100%",
    height: "100%"
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
  persianBulletContainer: {
    flexDirection: 'row-reverse', // Important for RTL layout
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  persianBullet: {
    fontSize: 20,
    lineHeight: 24,
    marginLeft: 10, // spacing between bullet and text
    color: '#333',
  },
  persianText: {
    textAlign: 'right',
    writingDirection: 'rtl',
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
    bottom: 40,
    backgroundColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 40,
    backgroundColor: 'transparent',
  },
  reGenerateTextButton: {
    position: 'absolute',
    bottom: 35,
    alignSelf: 'center',
    backgroundColor: 'transparent',      // no fill
    paddingHorizontal: 48,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'orange',              // red outline
  },
});
