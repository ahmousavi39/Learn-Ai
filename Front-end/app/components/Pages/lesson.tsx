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
  type ContentState = {
    title: string;
    bulletpoints: string[];
    imageUrl: string;
    imageUri?: any | null;
    id: number;
    isDone: boolean;
  };
  const [content, setContent] = useState<ContentState>({
    title: '',
    bulletpoints: [],
    imageUrl: '',
    imageUri: null,
    id: 0,
    isDone: false
  }); const [loading, setLoading] = useState(false);
  const [imageHeight, setImageHeight] = useState(220); // dynamic height
  let level = "4/10";
  const HTTP_SERVER = "https://learn-ai-w8ke.onrender.com";
  const screenWidth = Dimensions.get('window').width;

  const { courseId, sectionIndex, contentIndex, language } = route.params || {};

  useEffect(() => {
    const course = courses.find(course => course.id === courseId);
    if (course) {
      const section = course.sections[sectionIndex];
      level = course.level;
      if (section) {
        const newContent = section.content[contentIndex];
        setContent(newContent);
        // Dynamically calculate image height
        if (newContent.imageUri) {
          Image.getSize(
            newContent.imageUri,
            (width, height) => {
              const scaleFactor = (screenWidth - 20) / width;
              const newHeight = height * scaleFactor;
              setImageHeight(newHeight);
            },
            (error) => {
              console.warn('Failed to get image size:', error);
              setImageHeight(220); // fallback height
            }
          );
        }
      }
    }
  }, [courses, courseId, sectionIndex, contentIndex]);

  const goToNext = () => {
    dispatch(lessonDone({ courseId, sectionIndex, contentIndex }));
    const course = courses.find(course => course.id === courseId);
    if (!course) return;

    const section = course.sections[sectionIndex];
    if (!section) return;

    const nextContentIndex = contentIndex + 1;
    if (nextContentIndex < section.content.length) {
      dispatch(openLocation({ courseId, sectionIndex, contentIndex, isTest: false }));
      navigation.navigate('Lesson', {
        courseId,
        sectionIndex,
        contentIndex: nextContentIndex,
        language
      });
    } else {
      if (section.test && section.test.length > 0) {
        dispatch(openLocation({ courseId, sectionIndex, contentIndex: null, isTest: true }));
        navigation.navigate('Test', { questions: section.test, courseId, sectionIndex, language });
      } else {
        dispatch(openLocation({ courseId, sectionIndex: sectionIndex + 1, contentIndex: null, isTest: true }));
        navigation.navigate('Course', { courseId, selectedSectionIndex: sectionIndex });
      }
    }
  };

  const goToPrevious = () => {
    const course = courses.find(course => course.id === courseId);
    if (!course) return;

    const section = course.sections[sectionIndex];
    if (!section) return;

    if (contentIndex > 0) {
      navigation.navigate('Lesson', {
        courseId,
        sectionIndex,
        contentIndex: contentIndex - 1,
        language
      });
    } else {
      navigation.navigate('Course', {
        courseId,
        selectedSectionIndex: sectionIndex !== 0 ? sectionIndex - 1 : 0,
      });
    }
  };

  const reGenerate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${HTTP_SERVER}/regenerate-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletpoints: content.bulletpoints, level, language }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const res = await response.json();

      if (res.newBulletpoints && Array.isArray(res.newBulletpoints)) {
        dispatch(regenerateLesson({ courseId, sectionIndex, contentIndex, newBulletpoints: res.newBulletpoints }));
      } else {
        throw new Error('Invalid sections data from server');
      }
    } catch (error) {
      console.error('Failed to generate lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={!loading ? styles.container : styles.disabledContainer}>
          {loading && <View style={styles.centeredView}><ActivityIndicator size="large" color="#0000ff" /></View>}
          <ScrollView>
            {content.imageUrl ? (
              <Image
                source={{ uri: content.imageUri ? content.imageUri : content.imageUrl }}
                style={{
                  width: screenWidth - 20,
                  height: imageHeight,
                  borderRadius: 14,
                  marginBottom: 28,
                  alignSelf: 'center',
                }}
                resizeMode="contain"
              />
            ) : null}

            <View style={styles.textContainer}>
              <Text style={language === "fa" ? [styles.title, styles.persianText] : styles.title}>{content.title}</Text>
              <View style={styles.textBlock}>
                {content.bulletpoints.map((text, index) => (
                  <React.Fragment key={index}>
                    {language === 'fa' ? (
                      <View style={styles.persianBulletContainer}>
                        <Text style={styles.persianBullet}>{'\u2013'}</Text>
                        <Text style={[styles.bulletText, styles.persianText]}>{text}</Text>
                      </View>
                    ) : (
                      <View style={styles.bulletContainer}>
                        <Text style={styles.bullet}>{'\u2013'}</Text>
                        <Text style={styles.bulletText}>{text}</Text>
                      </View>
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.reGenerateTextButton} onPress={reGenerate}>
              <MaterialIcons name="refresh" size={36} color="orange" />
            </Pressable>
            <Pressable style={styles.nextButton} onPress={language === "fa" ? goToPrevious : goToNext}>
              <MaterialIcons name="navigate-next" size={36} color="#3730a3" />
            </Pressable>
            <Pressable style={styles.backButton} onPress={language === "fa" ? goToNext : goToPrevious}>
              <MaterialIcons name="navigate-before" size={36} color="#3730a3" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider >
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    justifyContent: 'space-between',
    flex: 1
  },
  disabledContainer: {
    paddingVertical: 10,
    justifyContent: 'space-between',
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  persianBullet: {
    fontSize: 20,
    lineHeight: 24,
    marginLeft: 10,
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
    backgroundColor: 'transparent',
    marginVertical: "auto",
    marginTop: 10

  },
  backButton: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'transparent',
    marginVertical: "auto",
    marginTop: 10
  },
  reGenerateTextButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 48,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'orange',
    alignSelf: 'center',
    position: 'absolute',
    marginVertical: "auto",
    marginTop: 10
  },
  reGenerateTextButtonContainer: {
    paddingTop: 14,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  footer: {
    width: "100%",
    height: 90,
    backgroundColor: "white",
    position: 'absolute',
    bottom: 0
  },
  textContainer: {
    paddingHorizontal: 10,
    paddingBottom: 100
  },
});