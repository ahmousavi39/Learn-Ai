import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, StyleSheet, Text, TextInput, TouchableHighlight, View, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../hook';
import { useAuth } from '../../../contexts/AuthContext';
import {
  loadData, selectCourses, openLocation, generateCourse
} from '../../../features/item/itemSlice';
import courseService from '../../../services/courseService';
import CourseLimitDisplay from '../CourseLimitDisplay';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { SelectList } from 'react-native-dropdown-select-list';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';
import generatingAnimation from '../../../assets/generating.json';
import searchingAnimation from '../../../assets/searching.json';
import doneAnimation from '../../../assets/done.json';
import errorAnimation from '../../../assets/error.json';
import loadingAnimation from '../../../assets/loading.json';
import processingAnimation from '../../../assets/processing.json';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ScrollView } from 'react-native';
import { downloadAndSaveImage } from '../../services/fileManager';
import { translate } from 'google-translate-api-x';
import axios from 'axios';
import { setLanguage, selectLanguage, selectModeSetting } from '../../../features/settings/settingsSlice';
import { loadSettings } from '../../../features/settings/settingsSlice';
import { useTheme } from '../../theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMagnifyingGlass, faXmark, faCrown } from '@fortawesome/free-solid-svg-icons';
import SubscriptionScreen from '../subscriptionScreen';
import { RightHeaderHome } from '../rightHeaderHome';

const CustomCheckbox = ({ value, onValueChange }) => {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={{
        height: 24,
        width: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#555',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {value && (
        <View
          style={{
            width: 12,
            height: 12,
            backgroundColor: '#555',
          }}
        />
      )}
    </TouchableOpacity>
  );
};

export function Home({ navigation }) {
  const dispatch = useAppDispatch();
  const courses = useAppSelector(selectCourses);
  const { user, canGenerateCourse, incrementCourseCount } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [text, setText] = useState('');
  const [levelOneToTen, setLevelOneToTen] = useState(4);
  const [time, setTime] = useState(10);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, done: false, sectionTitle: "", error: false, type: "" })
  const ws = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [downloadImage, setDownloadImage] = useState(false);
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const selectedLanguage = useAppSelector(selectLanguage);
  const selectedMode = useAppSelector(selectModeSetting);
  const { mode, setMode } = useTheme();

  const DUCKDUCKGO_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";

  const progressPercentage = ((progress.current - 1) / (progress.total - 1)) * 100;
  const widthAnim = new Animated.Value(progressPercentage);

  async function doneSound() {
    const { sound } = await Audio.Sound.createAsync(require('../../../assets/correct.mp3'));
    await sound.playAsync();
  }

  async function errorSound() {
    const { sound } = await Audio.Sound.createAsync(require('../../../assets/wrong.mp3'));
    await sound.playAsync();
  }

  useEffect(() => {
    dispatch(loadData());
    dispatch(loadSettings());
    setMode(selectedMode);
  }, [selectedMode]);

  React.useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progressPercentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress.current, progress.total]);

  const data = [
    { key: "en", value: "English" },
    { key: "zh", value: "中文" },
    { key: "hi", value: "हिन्दी" },
    { key: "es", value: "Español" },
    { key: "ar", value: "العربية" },
    { key: "fr", value: "Français" },
    { key: "bn", value: "বাংলা" },
    { key: "pt", value: "Português" },
    { key: "ru", value: "Русский" },
    { key: "ur", value: "اردو" },
    { key: "id", value: "Bahasa Indonesia" },
    { key: "de", value: "Deutsch" },
    { key: "ja", value: "日本語" },
    { key: "sw", value: "Kiswahili" },
    { key: "ta", value: "தமிழ்" },
    { key: "tr", value: "Türkçe" },
    { key: "mr", value: "मराठी" },
    { key: "te", value: "తెలుగు" },
    { key: "fa", value: "فارسی" },
    { key: "pl", value: "Polski" },
    { key: "uk", value: "Українська" },
    { key: "vi", value: "Tiếng Việt" },
    { key: "nl", value: "Nederlands" },
    { key: "el", value: "Ελληνικά" },
    { key: "sv", value: "Svenska" },
    { key: "ko", value: "한국어" },
    { key: "it", value: "Italiano" },
    { key: "th", value: "ไทย" },
    { key: "gu", value: "ગુજરાતી" },
    { key: "kn", value: "ಕನ್ನಡ" },
    { key: "my", value: "မြန်မာစာ" },
    { key: "ro", value: "Română" },
    { key: "pa", value: "ਪੰਜਾਬੀ" },
    { key: "ml", value: "മലയാളം" },
    { key: "or", value: "ଓଡ଼ିଆ" },
    { key: "az", value: "Azərbaycanca" },
    { key: "ha", value: "Hausa" },
    { key: "ne", value: "नेपाली" },
    { key: "si", value: "සිංහල" },
    { key: "he", value: "עברית" },
    { key: "ceb", value: "Cebuano" },
    { key: "hu", value: "Magyar" },
    { key: "cs", value: "Čeština" },
    { key: "yo", value: "Yorùbá" },
    { key: "zu", value: "isiZulu" },
    { key: "sn", value: "ChiShona" },
    { key: "so", value: "Soomaali" },
    { key: "xh", value: "isiXhosa" },
    { key: "jv", value: "Basa Jawa" },
    { key: "am", value: "አማርኛ" },
    { key: "km", value: "ភាសាខ្មែរ" },
    { key: "lo", value: "ລາວ" },
    { key: "la", value: "Latina" },
    { key: "eu", value: "Euskara" },
    { key: "gl", value: "Galego" },
    { key: "is", value: "Íslenska" },
    { key: "ga", value: "Gaeilge" },
    { key: "mt", value: "Malti" },
    { key: "sl", value: "Slovenščina" },
    { key: "sk", value: "Slovenčina" },
    { key: "et", value: "Eesti" },
    { key: "lv", value: "Latviešu" },
    { key: "lt", value: "Lietuvių" },
    { key: "mk", value: "Македонски" },
    { key: "ka", value: "ქართული" },
    { key: "hy", value: "Հայերեն" },
    { key: "sq", value: "Shqip" },
    { key: "be", value: "Беларуская" },
    { key: "bs", value: "Bosanski" },
    { key: "hr", value: "Hrvatski" },
    { key: "sr", value: "Српски" },
    { key: "tg", value: "Тоҷикӣ" },
    { key: "ky", value: "Кыргызча" },
    { key: "kk", value: "Қазақ тілі" },
    { key: "uz", value: "Oʻzbekcha" },
    { key: "ps", value: "پښتو" },
    { key: "sd", value: "سنڌي" },
    { key: "sm", value: "Gagana Sāmoa" },
    { key: "mi", value: "Māori" },
    { key: "co", value: "Corsu" },
    { key: "haw", value: "ʻŌlelo Hawaiʻi" },
    { key: "gd", value: "Gàidhlig" },
    { key: "st", value: "Sesotho" },
    { key: "ny", value: "Chichewa" },
    { key: "su", value: "Basa Sunda" },
    { key: "mn", value: "Монгол" },
    { key: "eo", value: "Esperanto" },
    { key: "hmn", value: "Hmong" },
    { key: "tl", value: "Filipino" },
    { key: "fy", value: "Frysk" },
    { key: "yi", value: "ייִדיש" },
    { key: "ig", value: "Asụsụ Igbo" },
    { key: "af", value: "Afrikaans" },
    { key: "lb", value: "Lëtzebuergesch" },
    { key: "cy", value: "Cymraeg" },
    { key: "jw", value: "Basa Jawa" }
  ];


  const connectWebSocket = (retry = true) => {
    try {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }

      ws.current = new WebSocket(process.env.EXPO_PUBLIC_WEBSTOCK_SERVER || 'ws://192.168.1.100:4000');

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        if (requestId.current) {
          ws.current.send(JSON.stringify({ type: 'register', requestId: requestId.current }));
          console.log('Registered with requestId:', requestId.current);
        } else {
          console.warn('Connected but no requestId to register');
        }
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setProgress({
          current: data.current,
          total: data.total,
          done: data.done,
          sectionTitle: data.sectionTitle,
          type: data.type,
          error: data.error,
        });
      };

      ws.current.onerror = (error) => {
        console.warn('WebSocket error:', error.message);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed');
        if (retry) {
          console.log('Retrying WebSocket connection...');
          setTimeout(() => connectWebSocket(false), 1000); // Retry once after 1 second
        }
      };
    } catch (e) {
      console.warn('WebSocket setup failed:', e.message);
      if (retry) {
        console.log('Retrying WebSocket setup...');
        setTimeout(() => connectWebSocket(false), 1000);
      }
    }
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function getVQDFromHTML(query) {
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': DUCKDUCKGO_USER_AGENT
        }
      });
      const html = response.data;
      // Extract vqd from the JavaScript variable in the HTML
      const match = html.match(/vqd="([^"]+)"/);
      return match ? match[1] : null;
    } catch (error) {
      console.error("Failed to get vqd:", error.message);
      return null;
    }
  }

  async function isImageUrl(url) {
    try {
      const response = await axios.head(url, {
        validateStatus: () => true,
        timeout: 2500
      });
      const contentType = response.headers['content-type'];
      return contentType && contentType.startsWith('image/');
    } catch (error) {
      return false;
    }
  }

  function retryIfTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
      promise
        .then((res) => {
          clearTimeout(timeoutId);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  const retryIfInvalid = async (fn, isValid, maxRetries = 4) => {
    let result;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      result = await fn();
      if (isValid(result)) return result;
      await delay(Math.pow(2, attempt) * 1000);
    }
    throw new Error(`Validation failed after ${maxRetries} retries.`);
  };

  async function getImageLink(query, url, headers) {
    try {
      const response = await axios.get(url, { headers, timeout: 10000 }); // Added timeout for the image search itself
      const results = response.data.results;

      for (const item of results) {
        if (item.image && !item.image.includes("ytimg.com") && item.height <= (item.width * 2)) {
          // Check if it's a valid image URL sequentially for robustness
          if (await isImageUrl(item.image)) {
            return item.image;
          }
        }
      }
      return null;
    } catch (error) {
      console.error(`Error fetching or checking images for query "${query}": ${error.message}`);
      return null;
    }
  }

  async function getImageWithRetry(query, language, retries = 3, timeoutMs = 10000) {
    const vqd = await retryIfInvalid(
      () => getVQDFromHTML(query),
      (v) => v !== null,
      3
    ).catch(err => {
      console.warn(`Failed to get vqd for query "${query}" after retries: ${err.message}`);
      return null;
    });

    if (!vqd) {
      return null;
    }

    const url = `https://duckduckgo.com/i.js?o=json&q=${encodeURIComponent(query)}&l=us-en&vqd=${encodeURIComponent(vqd)}&p=1&f=size%3ALarge`;
    const headers = {
      'User-Agent': DUCKDUCKGO_USER_AGENT
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let image;
        const queryEn = await translate(query, { from: language, to: "en" }).then(res => {
          return res.text;
        });
        if (attempt > 0) {
          const vqd = await retryIfInvalid(
            () => getVQDFromHTML(queryEn),
            (v) => v !== null,
            3 // Max 3 retries for vqd acquisition
          ).catch(err => {
            console.warn(`Failed to get vqd for query "${query}" after retries: ${err.message}`);
            return null;
          });
          const urlEn = `https://duckduckgo.com/i.js?o=json&q=${encodeURIComponent(queryEn)}&l=us-en&vqd=${encodeURIComponent(vqd)}&p=1&f=size%3ALarge`;

          image = await retryIfTimeout(getImageLink(queryEn, urlEn, headers), timeoutMs);
        } else {
          image = await retryIfTimeout(getImageLink(query, url, headers), timeoutMs);
        }
        if (image) return image;
      } catch (err) {
        console.log(`Attempt ${attempt + 1}/${retries + 1} for "${query}": No image found or operation timed out. Error: ${err.message}.`);
        if (attempt < retries) {
          await delay(Math.pow(2, attempt) * 1000); // Exponential backoff: 1s, 2s, 4s...
        }
      }
    }
    console.warn(`Failed to get image after ${retries + 1} attempts for query: "${query}"`);
    return null;
  }


  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true });

      if (result.canceled || !result.assets?.length) return;

      const validMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];

      const maxSize = 10 * 1024 * 1024; // 10MB
      const newFiles = [];

      for (const asset of result.assets) {
        if (selectedFiles.length + newFiles.length >= 3) {
          Alert.alert('Limit Exceeded', 'You can upload a maximum of 3 files.');
          break;
        }

        if (!validMimeTypes.includes(asset.mimeType || '')) {
          Alert.alert('Invalid File', `"${asset.name}" has an unsupported type.`);
          continue;
        }

        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (!fileInfo.exists || fileInfo.size > maxSize) {
          Alert.alert('File Too Large', `"${asset.name}" exceeds the 10MB limit.`);
          continue;
        }

        newFiles.push(asset);
      }

      setSelectedFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      console.error('File picking error:', err);
    }
  };

  const handleRemoveFile = (uri) => {
    setSelectedFiles(prev => prev.filter(file => file.uri !== uri));
  };

  const getCourseCompletion = (course) => {
    let total = 0;
    let done = 0;

    course.sections.forEach(section => {
      if (Array.isArray(section.content)) {
        total += section.content.length;
        done += section.content.filter(item => item.isDone).length;
      }

      if (Array.isArray(section.test)) {
        total += section.test.length;
        done += section.test.filter(test => test.isDone).length;
      }
    });

    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  // const onDownloadImages = async ({ courseId, targetCourse }) => {
  //   if (!courseId) {
  //     console.log("No course found to add imageUri");
  //     return;
  //   }

  //   for (let sectionIndex = 0; sectionIndex < targetCourse.sections.length; sectionIndex++) {
  //     const section = targetCourse.sections[sectionIndex];
  //     const imageDownloadPromises = section.content.map(async (content) => {
  //       const format = content.image?.match(/\.(\w+)(\?.*)?$/)?.[1]?.toLowerCase() || 'jpg';
  //       const name = `${content.id}.${format}`;
  //       const path = `${targetCourse.topic}/${sectionIndex}`;

  //       try {
  //         return await downloadAndSaveImage(content.image, path, name);
  //       } catch (err) {
  //         console.error(`Failed to download image for content ID ${content.id}:`, err);
  //         return null; // fallback if error occurs
  //       }
  //     });

  //     const imageUris = await Promise.all(imageDownloadPromises);

  //     const validImageUris = imageUris.filter(Boolean); // Remove failed/null downloads

  //     if (validImageUris.length === section.content.length) {
  //       dispatch(addSectionImageUri({ courseId, sectionIndex, imageUris: validImageUris }));
  //     } else {
  //       console.warn(`Section ${sectionIndex} - Not every content got an imageUri`);
  //     }
  //   }
  // };

  const onFindImages = async ({ targetCourse }) => {
    const courseWithImageUris = JSON.parse(JSON.stringify(targetCourse));
    const { sections, topic, language } = courseWithImageUris;

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex];

      const contentPromises = section.content.map(async (lesson, lessonIndex) => {
        const searchQuery = `${topic} ${lesson.title}`;
        const imageUrl = await getImageWithRetry(searchQuery, language);
        courseWithImageUris.sections[sectionIndex].content[lessonIndex].imageUrl = imageUrl;
        if (downloadImage) {
          const format = imageUrl.match(/\.(\w+)(\?.*)?$/)?.[1]?.toLowerCase() || 'jpg';
          const name = `${lesson.id}.${format}`;
          const path = `${topic}/${sectionIndex}`;
          const imageUri = await downloadAndSaveImage(imageUrl, path, name);
          courseWithImageUris.sections[sectionIndex].content[lessonIndex].imageUri = imageUri;
        }
      });
      await Promise.all(contentPromises);
    }

    return courseWithImageUris;
  };

  const handleGenerateCourse = async (topic, level, readingTimeMin, language) => {
    try {
      // Check course generation limits using the service (frontend-only check, no backend request)
      const limitCheck = await courseService.canGenerateCourse();
      
      if (!limitCheck.canGenerate) {
        setModalVisible(false); // Close the current modal
        
        if (limitCheck.needsSubscription) {
          // Directly open upgrade screen for anonymous users who reached limit
          console.log('🚀 Limit reached - opening upgrade screen directly');
          openPremiumScreen();
        } else {
          // Show generic limit reached message for other cases
          Alert.alert(
            '⚠️ Limit Reached',
            limitCheck.message || 'You\'ve reached your monthly course limit.',
            [{ text: 'OK' }]
          );
        }
        return; // Important: Stop here, no backend request should be made
      }

      // Proceed with course generation only if limit check passes
      await generate(topic, level, readingTimeMin, language);
      
      // Note: Course count is automatically incremented by the backend and frontend service
    } catch (error) {
      console.error('Error generating course:', error);
    }
  };

  const generate = async (topic, level, readingTimeMin, language) => {
    const hasFiles = selectedFiles.length > 0;

    setProgress({
      type: hasFiles ? 'UPLOADING' : 'PLANING',
      current: 0,
      total: 0,
      sectionTitle: hasFiles ? 'Uploading Files' : 'Planing the course',
      error: false,
      done: false
    });

    const timeoutTimeInMs = 240000 + (hasFiles ? selectedFiles.length * 120000 : 0);

    const fetchWithTimeout = (url, options, timeout = timeoutTimeInMs) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(id));
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      setLoading(true);
      requestId.current = uuidv4();
      connectWebSocket();

      // Use courseService for proper authentication and tracking
      const response = await courseService.generateCourse({
        topic,
        level,
        time: readingTimeMin.toString(),
        language,
        requestId: requestId.current,
        files: selectedFiles
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const generatedCourse = await response.json();

      setProgress(prev => ({
        ...prev,
        done: false,
        error: false,
        sectionTitle: "Finding the right Images",
        type: "IMAGE"
      }));

      const courseWithImageUrls = await onFindImages({ targetCourse: generatedCourse });

      if (courseWithImageUrls.sections && Array.isArray(courseWithImageUrls.sections)) {
        dispatch(generateCourse({
          name: courseWithImageUrls.topic,
          sections: courseWithImageUrls.sections,
          language: courseWithImageUrls.language,
          level: courseWithImageUrls.level
        }));

        setProgress(prev => ({
          ...prev,
          done: true,
          error: false,
          sectionTitle: "Generating Course Plan",
          type: "DONE"
        }));

        // Update AuthContext with new course count
        try {
          await incrementCourseCount();
          console.log('✅ AuthContext course count updated after course generation');
        } catch (error) {
          console.error('❌ Failed to update AuthContext course count:', error);
          // Don't fail the entire operation for this
        }

        doneSound();
        setText('');
        await sleep(2000);

        setModalVisible(false);
        setLoading(false);
      } else {
        throw new Error('Invalid sections data from server');
      }
    } catch (error) {
      setProgress({
        type: 'ERROR',
        current: 0,
        total: 0,
        error: true,
        done: false,
        sectionTitle: "Could not generate course. Please try later!"
      });
      errorSound();
      await sleep(5000);
      setLoading(false);
    }
  };


  const openCourse = (id) => {
    courses.map(course => {
      if (course.id === id) {
        dispatch(openLocation({ courseId: course.id, sectionIndex: null, contentIndex: null, isTest: false }))
        navigation.navigate('Course', {
          courseId: id,
          selectedSectionIndex: undefined
        });
      }
    });
  };

  const openPremiumScreen = () => {
    // Open subscription screen modal
    setSubscriptionModalVisible(true);
  };

  // Set navigation options with the openPremiumScreen function
  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => <RightHeaderHome onPremiumPress={openPremiumScreen} />,
    });
  }, [navigation]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={modalVisible ? styles.containerDisabled : styles.container}>
        <ScrollView>
          {courses.map((course, index) => {
            if (index % 2 === 0) {
              return (
                <View style={styles.row} key={index}>
                  {/* First button */}
                  <TouchableHighlight
                    underlayColor={'transparent'}
                    style={styles.touchableHighlight}
                    onPress={() => openCourse(course.id)}
                  >
                    <View style={styles.buttonContainer}>
                      <View style={[styles.progressOverlay, { height: `${getCourseCompletion(course)}%` }]} />
                      <View style={styles.buttonContent}>
                        <Text style={styles.cardText}>{course.name}</Text>
                        <Text style={styles.cardSmallText}>{getCourseCompletion(course)}% Complete</Text>
                      </View>
                    </View>
                  </TouchableHighlight>

                  {/* Second button if exists */}
                  {courses[index + 1] && (
                    <TouchableHighlight
                      underlayColor={'transparent'}
                      style={styles.touchableHighlight}
                      onPress={() => openCourse(courses[index + 1].id)}
                    >
                      <View style={styles.buttonContainer}>
                        <View style={[styles.progressOverlay, { height: `${getCourseCompletion(courses[index + 1])}%` }]} />
                        <View style={styles.buttonContent}>
                          <Text style={styles.cardText}>{courses[index + 1].name}</Text>
                          <Text style={styles.cardSmallText}>{getCourseCompletion(courses[index + 1])}% Complete</Text>
                        </View>
                      </View>
                    </TouchableHighlight>
                  )}
                </View>
              );
            }
            return null;
          })}

          {/* Add button */}
          <View style={styles.row}>
            <TouchableHighlight underlayColor={'transparent'} style={styles.touchableHighlight} onPress={() => setModalVisible(true)}>
              <View style={styles.buttonContainer}>
                <View style={styles.buttonContent}>
                  <Text style={styles.cardText}>Add +</Text>
                </View>
              </View>
            </TouchableHighlight>
          </View>
        </ScrollView>
        
        {/* Course Limit Display */}
        <CourseLimitDisplay 
          onSubscribe={() => {
            setModalVisible(false);
            openPremiumScreen();
          }}
        />
        
        {/* Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible);
          }}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>

              {loading ? (progress.type === "PROGRESS" ? <View style={styles.searchingContainer}>
                <LottieView
                  source={searchingAnimation}
                  autoPlay
                  loop
                  style={styles.xtraLargeAnimation}
                />
                <View style={styles.wrapper}>
                  <Animated.View style={[styles.progress, {
                    width: widthAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    })
                  }]} />
                </View>
                <Text style={styles.modalTextLessMargin}>Generating {progress.current}/{progress.total} sections</Text>
                <Text style={styles.modalText}>({progress.sectionTitle})</Text>
              </View> : progress.type === "DONE" ? <View style={styles.searchingContainer}>
                <LottieView
                  source={doneAnimation}
                  autoPlay
                  loop={false}
                  style={styles.xtraLargeAnimation}
                />
                <View style={styles.wrapper}>
                  <Animated.View style={[styles.progress, {
                    width: widthAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    })
                  }]} />
                </View>
                <Text style={styles.modalText}>Done!</Text>
              </View> : progress.type === "PLANING" ? <View style={styles.generatingContainer}>
                <LottieView
                  source={generatingAnimation}
                  autoPlay
                  loop
                  style={styles.largeAnimation}
                />
                <Text style={styles.modalText}>Making a course plan</Text>
              </View> : progress.type === "UPLOADING" ? <View style={styles.generatingContainer}>
                <LottieView
                  source={loadingAnimation}
                  autoPlay
                  loop
                  style={styles.largeAnimation}
                />
                <Text style={styles.modalText}>Uploading the file{"[s]"}...</Text>
              </View> : progress.type === "PROCESSING" ? <View style={styles.generatingContainer}>
                <LottieView
                  source={processingAnimation}
                  autoPlay
                  loop
                  style={styles.xtraLargeAnimation}
                />
                <Text style={styles.modalText}>Processing the file{"[s]"}...</Text>
              </View> : progress.type === "IMAGE" ?
                <View style={styles.generatingContainer}>
                  <LottieView
                    source={processingAnimation}
                    autoPlay
                    loop
                    style={styles.xtraLargeAnimation}
                  />
                  <Text style={styles.modalText}>Finding the right Images...</Text>
                </View>
                : <View style={styles.searchingContainer}>
                  <LottieView
                    source={errorAnimation}
                    autoPlay
                    loop={false}
                    style={styles.smallAnimation}
                  />
                  <Text style={styles.modalText}>Opps! something went worng...</Text>
                  <Text style={styles.modalText}>Please try later</Text>
                </View>) : ""}

              {!loading && <>
                <Text style={styles.modalText}>I want to learn </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Music Production ..."
                  onChangeText={(value) => setText(value)}
                  value={text}
                  placeholderTextColor={theme.inputText}
                />

                <Text style={styles.modalTextLessMargin}>Select Level: {levelOneToTen}</Text>
                <MultiSlider
                  values={[levelOneToTen]}
                  onValuesChange={(values) => setLevelOneToTen(values[0])}
                  min={1}
                  max={10}
                  step={1}
                  sliderLength={280}
                  selectedStyle={{ backgroundColor: theme.secondary }}
                  unselectedStyle={{ backgroundColor: theme.progressWrapper }}
                  trackStyle={{ height: 4 }}
                  markerStyle={{ height: 20, width: "100%", backgroundColor: theme.secondary }}
                />

                <Text style={styles.modalTextLessMargin}>Time to Learn (min): {time}</Text>
                <MultiSlider
                  values={[time]}
                  onValuesChange={(values) => setTime(values[0])}
                  min={10}
                  max={120}
                  step={10}
                  sliderLength={280}
                  selectedStyle={{ backgroundColor: theme.secondary }}
                  unselectedStyle={{ backgroundColor: theme.progressWrapper }}
                  trackStyle={{ height: 4 }}
                  markerStyle={{ height: 20, width: "100%", backgroundColor: theme.secondary }}
                />


                <Text style={styles.modalText}>Select Language:</Text>
                <SelectList
                  setSelected={(lang) => {
                    dispatch(setLanguage({ key: lang }));
                  }}
                  data={data}
                  boxStyles={styles.input}
                  dropdownStyles={styles.dropdown}
                  inputStyles={styles.selectionText}
                  dropdownTextStyles={styles.selectionText}
                  searchPlaceholder=''
                  searchicon={<FontAwesomeIcon icon={faMagnifyingGlass} style={styles.selectionIcon} />}
                  closeicon={<FontAwesomeIcon icon={faXmark} style={styles.selectionIcon} />}
                  defaultOption={data.find(lang => lang.key == selectedLanguage?.key)}
                />

                <View style={styles.pickFile}>
                  <Button title="Pick Files" onPress={pickFiles} />
                </View>
                <Text style={styles.modalText}>Upload Files (max 3 - txt only):</Text>

                {selectedFiles.map((file, index) => (
                  <View
                    key={file.uri}
                    style={styles.filesContainer}
                  >
                    <Text style={{ flex: 1, fontSize: 12, color: 'gray' }} numberOfLines={1}>{file.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveFile(file.uri)}>
                      <Text style={{ color: 'red', marginLeft: 12 }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <CustomCheckbox value={downloadImage} onValueChange={setDownloadImage} />
                  <Text style={[{ marginLeft: 8, paddingBottom: 10 }, styles.modalTextLessMargin]}>Download images</Text>
                </View>

                <View style={styles.buttonContainerModal}>
                  <TouchableHighlight underlayColor={'transparent'} onPress={() => setModalVisible(false)}>
                    <View style={styles.cancel}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </View>
                  </TouchableHighlight>
                  <TouchableHighlight underlayColor={'transparent'} onPress={() => handleGenerateCourse(text, levelOneToTen, time, selectedLanguage?.key)}>
                    <View style={styles.generate}>
                      <Text style={styles.generateText}>Generate</Text>
                    </View>
                  </TouchableHighlight>
                </View>
              </>}
            </View>
          </View>
          </Modal>

        {/* Subscription Modal */}
        <Modal
          animationType="slide"
          transparent={false}
          visible={subscriptionModalVisible}
          onRequestClose={() => setSubscriptionModalVisible(false)}
        >
          <SubscriptionScreen
            onSubscriptionSuccess={(user) => {
              console.log('Subscription successful:', user);
              setSubscriptionModalVisible(false);
              // You can add additional logic here, like updating user state
            }}
            onSkip={() => setSubscriptionModalVisible(false)}
          />
        </Modal>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }function getStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 10,
      backgroundColor: theme.background
    },
    generatingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 10,
      margin: 'auto'
    },
    searchingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 10,
    },
    containerDisabled: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 10,
      backgroundColor: theme.disBackground,
            filter: "brightness(50%)"
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    touchableHighlight: {
      alignItems: 'center',
      padding: 10,
      margin: 5,
      width: '50%',
    },
    buttonContainer: {
      position: 'relative',
      backgroundColor: theme.card,
      borderRadius: 10,
      width: '100%',
      height: 150,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.progress,
      zIndex: 0,
    },
    buttonContent: {
      zIndex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      paddingTop: 55,
      paddingBottom: 55,

    },
    cardText: {
      color: theme.cardText,
      textAlign: 'center',
      fontSize: 20

    },
    cardSmallText: {
      color: theme.cardText,
      textAlign: 'center',
      fontSize: 10
    },
    input: {
      height: 43,
      borderColor: theme.inputBorder,
      borderWidth: 0.5,
      paddingHorizontal: 8,
      width: '100%',
      backgroundColor: theme.inputBackground,
      borderRadius: 10,
      color: theme.text
    },
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    modalView: {
      margin: 15,
      backgroundColor: theme.background,
      borderRadius: 20,
      padding: 15,
      shadowColor: theme.shadow,
      width: '90%',
      shadowOpacity: 0.25,
      shadowRadius: 4,
      minHeight: 200,
      minWidth: 200
    },
    modalText: {
      marginBottom: 15,
      textAlign: 'left',
      color: theme.text
    },
    modalTextLessMargin: {
      marginVertical: 5,
      textAlign: 'left',
      color: theme.text,
      paddingTop: 10
    },
    buttonContainerModal: {
      flexDirection: 'row',
      marginLeft: 'auto',
      marginTop: 10,
    },
    cancel: {
      padding: 10,
      width: '100%',
    },
    cancelText: {
      color: theme.text,
      opacity: 0.7,
    },
    generate: {
      padding: 10,
      width: '100%',
    },
    generateText: {
      color: theme.secondary,
    },
    slider: {
      width: '100%',
      height: 40,
    },
    wrapper: {
      height: 20,
      width: '100%',
      backgroundColor: theme.progressWrapper,
      borderRadius: 10,
      overflow: 'hidden',
      marginVertical: 20
    },
    progress: {
      height: '100%',
      backgroundColor: theme.progress,
    },
    largeAnimation: {
      width: 100,
      height: 100,
      paddingVertical: 20
    },
    smallAnimation: {
      width: 50,
      height: 50,
      paddingVertical: 10
    },
    xtraLargeAnimation: {
      width: 200,
      height: 200,
      paddingVertical: 20
    },
    pickFile: {
      paddingTop: 20
    },
    dropdown: {
      backgroundColor: theme.inputBackground,
      color: theme.text
    },
    filesContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      padding: 8,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 6,
      justifyContent: 'space-between',
    },
    selectionText: {
      color: theme.text
    },
    selectionIcon: {
      color: theme.text,
      paddingHorizontal: 10,
      paddingRight: 20
    },
  });
}