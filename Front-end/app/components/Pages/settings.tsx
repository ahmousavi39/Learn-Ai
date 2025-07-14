import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert, Modal } from 'react-native';
import { Text, TouchableHighlight } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { resetData } from '../../../features/item/itemSlice';
import { useAppDispatch } from '../../hook';
import { useTheme } from '../../theme';
import { setModeSetting } from '../../../features/settings/settingsSlice';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
// import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
// import { SelectList } from 'react-native-dropdown-select-list'
import {
  Animated,
  PanResponder,
  Easing,
  Dimensions,
} from 'react-native';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

export function Settings() {
  const dispatch = useAppDispatch();
  const [modalVisible, setModalVisible] = useState(false);
  const { mode, setMode } = useTheme();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const knobStartValue = useRef(0);
  const knobX = useRef(new Animated.Value(mode === 'dark' ? 1 : 0)).current;
  const knobWidth = 30;
  const containerWidth = 150;
  const maxTranslateX = containerWidth - knobWidth - 10;

  const toggleTheme = (toDark: boolean) => {
    const newMode = toDark ? 'dark' : 'light';
    setMode(newMode);
    dispatch(setModeSetting(newMode));

    Animated.timing(knobX, {
      toValue: toDark ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.circle),
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        knobX.stopAnimation((value) => {
          knobStartValue.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const newVal = knobStartValue.current + gesture.dx / maxTranslateX;
        knobX.setValue(Math.max(0, Math.min(1, newVal)));
      },
      onPanResponderRelease: () => {
        knobX.stopAnimation((currentValue) => {
          const toDark = currentValue > 0.5;
          toggleTheme(toDark);
        });
      },
    })
  ).current;



  // const data = [{ key: "system", value: "Default" }, { key: "dark", value: "Dark" }, { key: "light", value: "Light" }];
  const toResetData = () => {
    dispatch(resetData());
    setModalVisible(false);
  }

  return (
    <>
      <SafeAreaProvider>
        <SafeAreaView style={modalVisible ? styles.containerDisabled : styles.container}>
          {/* <SelectList
            setSelected={modeOption => {
              setMode(modeOption);
              dispatch(setModeSetting(modeOption));
            }}
            data={data}
            defaultOption={data.find(modeOption => (modeOption.key == mode))}
            boxStyles={styles.input}
            dropdownStyles={styles.dropdown}
            inputStyles={styles.selectionText}
            dropdownTextStyles={styles.selectionText}
            arrowicon={<FontAwesomeIcon icon={faChevronDown} style={styles.selectionIcon} />}
            search={false}
          /> */}
          <View style={styles.modeSwitchContainer}>
            <View
              style={styles.toggleContainer}
            >
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.toggleKnob,
                  {
                    transform: [
                      {
                        translateX: knobX.interpolate({
                          inputRange: [0, 1],
                          outputRange: [5, maxTranslateX],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <FontAwesomeIcon
                  icon={mode === 'light' ? faSun : faMoon}
                  size={16}
                  color={theme.background}
                />
              </Animated.View>
            </View>
          </View>

          <TouchableHighlight underlayColor={'transparent'} onPress={() => setModalVisible(true)}>
            <View style={styles.reset}>
              <Text style={styles.text}>Reset Data</Text>
            </View>
          </TouchableHighlight>

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
                <Text style={styles.modalText}>Do you want to reset the app? All generated courses will be deleted!</Text>
                <View style={styles.buttonContainer}>
                  <TouchableHighlight underlayColor={'transparent'} onPress={toResetData}>
                    <View style={styles.resetData}>
                      <Text style={styles.text}>Reset</Text>
                    </View>
                  </TouchableHighlight>
                  <TouchableHighlight underlayColor={'transparent'} onPress={() => setModalVisible(false)}>
                    <View style={styles.cancle}>
                      <Text style={styles.cancleText}>Cancel</Text>
                    </View>
                  </TouchableHighlight>

                </View>
              </View>
            </View>
          </Modal>

        </SafeAreaView>
      </SafeAreaProvider>
    </>
  );
}

function getStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingTop: 50,
      backgroundColor: theme.background,
    },
    containerDisabled: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingTop: 50,
      backgroundColor: theme.disBackground,
      filter: "brightness(50%)"
    },
    button: {
      alignItems: 'center',
      padding: 10,
      margin: 5,
    },
    text: {
      color: theme.cardText,
    },
    countContainer: {
      alignItems: 'center',
      padding: 10,
    },
    reset: {
      backgroundColor: theme.error,
      alignItems: 'center',
      padding: 10,
      margin: 5,
      marginVertical: 15,
      borderRadius: 10,
    },
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalView: {
      margin: 15,
      backgroundColor: theme.background,
      borderRadius: 20,
      padding: 15,
      shadowColor: theme.shadow,
      width: "90%",
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    modalText: {
      marginBottom: 15,
      textAlign: 'left',
      color: theme.text,
    },
    buttonContainer: {
      flexDirection: "row",
      marginLeft: "auto",
      marginTop: 10
    },
    cancle: {
      padding: 10,
      width: "100%"
    },
    cancleText: {
      color: theme.secondary,
      opacity: 0.7
    },
    resetData: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: theme.error,
      width: "100%",
      borderRadius: 5,
      marginVertical: 5
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
    selectionText: {
      color: theme.text
    },
    selectionIcon: {
      color: theme.text,
      paddingHorizontal: 10,
      paddingRight: 20
    },
    dropdown: {
      backgroundColor: theme.inputBackground,
      color: theme.text
    },
    modeSwitchContainer: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    toggleContainer: {
      width: 146,
      height: 40,
      borderRadius: 25,
      padding: 5,
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: theme.inputBackground
    },
    toggleKnob: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderRadius: 20,
      backgroundColor: theme.text,
      justifyContent: 'center',
      alignItems: 'center',
      top: 5,
      left: 0,
      zIndex: 2,
    },
    modeLabelWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    }
  });
};