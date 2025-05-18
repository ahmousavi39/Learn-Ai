import React, { useEffect, useState } from 'react';
import { Alert, Button, Modal, StyleSheet, Text, TextInput, TouchableHighlight, View, ActivityIndicator } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../hook';
import { loadData, selectCourses, selectCoursesList, generateCourse } from '../../../features/item/itemSlice';
import Slider from '@react-native-community/slider';
import { SelectList } from 'react-native-dropdown-select-list';

export function Home({ navigation }) {
  const dispatch = useAppDispatch();
  const courses = useAppSelector(selectCourses);
  const [modalVisible, setModalVisible] = useState(false);
  const [text, setText] = useState('');
  const [levelOneToTen, setLevelOneToTen] = useState(4);
  const [time, setTime] = useState(10);
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);

  const data = [
    { key: 'en', value: 'English' },
    { key: 'de', value: 'Deutsch' },
    { key: 'es', value: 'Español' },
    { key: 'fr', value: 'Français' },
    { key: 'ru', value: 'Русский' },
    { key: 'fa', value: 'فارسی' }
  ];

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
    try {
      setLoading(true);
      const response = await fetch('http://192.168.2.107:4000/generate-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, level, time: readingTimeMin, language }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const sections = data.sections;

      if (sections && Array.isArray(sections)) {
        dispatch(generateCourse({ name: topic, sections }));
        setText('');
        setModalVisible(false);
      } else {
        throw new Error('Invalid sections data from server');
      }
    } catch (error) {
      console.error('Failed to generate course:', error);
      Alert.alert('Error', 'Could not generate course.');
    } finally {
      setLoading(false);
    }
  };

  const openCourse = (id) => {
    courses.map(course => {
      if (course.id === id) {
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
                    <View style={[styles.progressOverlay, { height: `${getCourseCompletion(course)}%` }]} />                    <View style={styles.buttonContent}>
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
                      <View style={[styles.progressOverlay, { height: `${getCourseCompletion(courses[index + 1])}%` }]} />                      <View style={styles.buttonContent}>
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
            Alert.alert('Modal has been closed.');
            setModalVisible(!modalVisible);
          }}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              {loading && <ActivityIndicator size="large" color="#0000ff" />}
              {!loading && <>
                <Text style={styles.modalText}>I want to learn </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Music Production ..."
                  onChangeText={(value) => setText(value)}
                  value={text}
                />

                <Text style={styles.modalText}>Select Level: {levelOneToTen}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  value={levelOneToTen}
                  onValueChange={setLevelOneToTen}
                />

                <Text style={styles.modalText}>Time to Learn (min): {time}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={10}
                  maximumValue={120}
                  step={10}
                  value={time}
                  onValueChange={setTime}
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
    fontSize: 24

  },
    smallText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 0.5,
    paddingHorizontal: 8,
    marginBottom: 10,
    width: '100%',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
