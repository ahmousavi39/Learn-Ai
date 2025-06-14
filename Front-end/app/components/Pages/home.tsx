import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, StyleSheet, Text, TextInput, TouchableHighlight, View, Animated } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../hook';
import { loadData, selectCourses, selectCoursesList, openLocation, generateCourse } from '../../../features/item/itemSlice';
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


export function Home({ navigation }) {
  const dispatch = useAppDispatch();
  const courses = useAppSelector(selectCourses);
  const [modalVisible, setModalVisible] = useState(false);
  const [text, setText] = useState('');
  const [levelOneToTen, setLevelOneToTen] = useState(4);
  const [time, setTime] = useState(10);
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const requestId = useRef(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, done: false, sectionTitle: "", error: false, type: "" })
  const ws = useRef(null);

  const HTTP_SERVER = "https://learn-ai-w8ke.onrender.com";
  const LOCAL_HTTP_SERVER = "http://192.168.2.107:4000"
  const WS_SERVER = "wss://learn-ai-w8ke.onrender.com";
  const LOCAL_WS_SERVER = "ws://192.168.2.107:4000";

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

  React.useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progressPercentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress.current, progress.total]);

  const data = [
    { key: 'en', value: 'English' },
    { key: 'de', value: 'Deutsch' },
    { key: 'es', value: 'Español' },
    { key: 'fr', value: 'Français' },
    { key: 'ru', value: 'Русский' },
    { key: 'fa', value: 'فارسی' }
  ];

  const connectWebSocket = (retry = true) => {
    try {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }

      ws.current = new WebSocket(WS_SERVER);

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
        console.log(data);
        if (data.type === 'progress') {
          setProgress({
            current: data.current,
            total: data.total,
            done: false,
            sectionTitle: data.sectionTitle,
            type: data.type,
            error: false,
          });
        } else if (data.type === 'done') {
          setProgress((p) => ({ ...p, done: true, type: "done" }));
        }
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


  useEffect(() => {
    dispatch(loadData());
  }, []);

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

  const generate = async (topic, level, readingTimeMin, language) => {
    const fetchWithTimeout = (url, options, timeout = 120000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(id));
    };
    try {
      setLoading(true);
      setProgress({ current: 0, total: 0, done: false, sectionTitle: "", error: false, type: "planing" });

      // Generate and store requestId in ref
      requestId.current = uuidv4();

      // Connect WS after new requestId is ready
      connectWebSocket();

      const response = await fetchWithTimeout(`${HTTP_SERVER}/generate-course`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level, time: readingTimeMin, language, requestId: requestId.current }),
      });

      console.log(response)

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.sections && Array.isArray(data.sections)) {
        dispatch(generateCourse({ name: data.topic, sections: data.sections, language: data.language, level }));
        setProgress((p) => ({ ...p, done: true, type: "done" }));
        doneSound();
        setText('');
        setTimeout(() => {
          setModalVisible(false);
          setLoading(false);
        }, 2000)
      } else {
        throw new Error('Invalid sections data from server');
      }
    } catch (error) {
      setProgress({ current: 0, total: 0, done: false, sectionTitle: "Could not generate course. Please try later!", type: 'error', error: true })
      errorSound();
      setTimeout(() => { setLoading(false); }, 5000)
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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={modalVisible ? styles.containerDisabled : styles.container}>
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
                      <Text style={styles.text}>{course.name}</Text>
                      <Text style={styles.smallText}>{getCourseCompletion(course)}% Complete</Text>
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
                        <Text style={styles.text}>{courses[index + 1].name}</Text>
                        <Text style={styles.smallText}>{getCourseCompletion(courses[index + 1])}% Complete</Text>
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
                <Text style={styles.text}>Add +</Text>
              </View>
            </View>
          </TouchableHighlight>
        </View>

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

              {loading ? (progress.type === "progress" ? <View style={styles.searchingContainer}>
                <LottieView
                  source={searchingAnimation}
                  autoPlay
                  loop
                  style={styles.largeAnimation}
                />
                <View style={styles.wrapper}>
                  <Animated.View style={[styles.progress, {
                    width: widthAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    })
                  }]} />
                </View>
                <Text>Generating {progress.current}/{progress.total} sections</Text>
                <Text>({progress.sectionTitle})</Text>
              </View> : progress.type === "done" ? <View style={styles.searchingContainer}>
                <LottieView
                  source={doneAnimation}
                  autoPlay
                  loop={false}
                  style={styles.largeAnimation}
                />
                <View style={styles.wrapper}>
                  <Animated.View style={[styles.progress, {
                    width: widthAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    })
                  }]} />
                </View>
                <Text>Done!</Text>
              </View> : progress.type === "planing" ? <View style={styles.generatingContainer}>
                <LottieView
                  source={generatingAnimation}
                  autoPlay
                  loop
                  style={styles.largeAnimation}
                />
                <Text>Making a course plan</Text>
              </View> : <View style={styles.searchingContainer}>
                <LottieView
                  source={errorAnimation}
                  autoPlay
                  loop={false}
                  style={styles.smallAnimation}
                />
                <Text>Opps! something went worng...</Text>
                <Text>Please try later</Text>
              </View>) : ""}

              {!loading && <>
                <Text style={styles.modalText}>I want to learn </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Music Production ..."
                  onChangeText={(value) => setText(value)}
                  value={text}
                />

                <Text style={styles.modalText}>Select Level: {levelOneToTen}</Text>
                <MultiSlider
                  values={[levelOneToTen]}
                  onValuesChange={(values) => setLevelOneToTen(values[0])}
                  min={1}
                  max={10}
                  step={1}
                  sliderLength={280}
                  selectedStyle={{ backgroundColor: '#fc4848' }}
                  unselectedStyle={{ backgroundColor: '#ccc' }}
                  trackStyle={{ height: 4 }}
                  markerStyle={{ height: 20, width: "100%", backgroundColor: '#fc4848' }}
                />

                <Text style={styles.modalText}>Time to Learn (min): {time}</Text>
                <MultiSlider
                  values={[time]}
                  onValuesChange={(values) => setTime(values[0])}
                  min={10}
                  max={120}
                  step={10}
                  sliderLength={280}
                  selectedStyle={{ backgroundColor: '#fc4848' }}
                  unselectedStyle={{ backgroundColor: '#ccc' }}
                  trackStyle={{ height: 4 }}
                  markerStyle={{ height: 20, width: "100%", backgroundColor: '#fc4848' }}
                />


                <Text style={styles.modalText}>Select Language:</Text>
                <SelectList
                  setSelected={(lan) => setLang(lan)}
                  data={data}
                  defaultOption={data.find(lan => (lan.key == 'en'))}
                />

                <View style={styles.buttonContainerModal}>
                  <TouchableHighlight underlayColor={'transparent'} onPress={() => setModalVisible(false)}>
                    <View style={styles.cancel}>
                      <Text style={styles.cancelText}>Abbrechen</Text>
                    </View>
                  </TouchableHighlight>
                  <TouchableHighlight underlayColor={'transparent'} onPress={() => generate(text, levelOneToTen, time, lang)}>
                    <View style={styles.generate}>
                      <Text style={styles.generateText}>Generate</Text>
                    </View>
                  </TouchableHighlight>
                </View>
              </>}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: '#fc4848e0',
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
    backgroundColor: 'green',
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
  text: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20

  },
  smallText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 10
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 0.5,
    paddingHorizontal: 8,
    marginBottom: 10,
    width: '100%',
    color: "black"
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalView: {
    margin: 15,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    width: '90%',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minHeight: 200,
    minWidth: 200
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'left',
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
    color: 'black',
    opacity: 0.7,
  },
  generate: {
    padding: 10,
    width: '100%',
  },
  generateText: {
    color: 'blue',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  wrapper: {
    height: 20,
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
  },
  progress: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  largeAnimation: { width: 100, height: 100, paddingVertical: 20 },
  smallAnimation: { width: 50, height: 50, paddingVertical: 10 }
});
