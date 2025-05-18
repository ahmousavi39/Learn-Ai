import React, { useEffect, useState } from 'react';
import { Pressable, View, StyleSheet, Alert, Modal } from 'react-native';
import { Text, TouchableHighlight } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { setLanguage } from '../../../features/settings/settingsSlice';
import { loadData, resetData } from '../../../features/item/itemSlice';
import { useAppDispatch, useAppSelector } from '../../hook';
import { selectLanguage } from '../../../features/settings/settingsSlice';
import { SelectList } from 'react-native-dropdown-select-list'

export function Settings() {
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectLanguage);
  const [modalVisible, setModalVisible] = useState(false);

  const data = [
    { "key": "af", "value": "Afrikaans" },
    { "key": "sq", "value": "Albanian" },
    { "key": "am", "value": "Amharic" },
    { "key": "ar", "value": "Arabic" },
    { "key": "hy", "value": "Armenian" },
    { "key": "az", "value": "Azerbaijani" },
    { "key": "eu", "value": "Basque" },
    { "key": "be", "value": "Belarusian" },
    { "key": "bn", "value": "Bengali" },
    { "key": "bs", "value": "Bosnian" },
    { "key": "bg", "value": "Bulgarian" },
    { "key": "ca", "value": "Catalan" },
    { "key": "ceb", "value": "Cebuano" },
    { "key": "ny", "value": "Chichewa" },
    { "key": "zh", "value": "Chinese (Simplified)" },
    { "key": "zh-TW", "value": "Chinese (Traditional)" },
    { "key": "co", "value": "Corsican" },
    { "key": "hr", "value": "Croatian" },
    { "key": "cs", "value": "Czech" },
    { "key": "da", "value": "Danish" },
    { "key": "nl", "value": "Dutch" },
    { "key": "en", "value": "English" },
    { "key": "eo", "value": "Esperanto" },
    { "key": "et", "value": "Estonian" },
    { "key": "tl", "value": "Filipino" },
    { "key": "fi", "value": "Finnish" },
    { "key": "fr", "value": "French" },
    { "key": "fy", "value": "Frisian" },
    { "key": "gl", "value": "Galician" },
    { "key": "ka", "value": "Georgian" },
    { "key": "de", "value": "German" },
    { "key": "el", "value": "Greek" },
    { "key": "gu", "value": "Gujarati" },
    { "key": "ht", "value": "Haitian Creole" },
    { "key": "ha", "value": "Hausa" },
    { "key": "haw", "value": "Hawaiian" },
    { "key": "iw", "value": "Hebrew" },
    { "key": "hi", "value": "Hindi" },
    { "key": "hmn", "value": "Hmong" },
    { "key": "hu", "value": "Hungarian" },
    { "key": "is", "value": "Icelandic" },
    { "key": "ig", "value": "Igbo" },
    { "key": "id", "value": "Indonesian" },
    { "key": "ga", "value": "Irish" },
    { "key": "it", "value": "Italian" },
    { "key": "ja", "value": "Japanese" },
    { "key": "jw", "value": "Javanese" },
    { "key": "kn", "value": "Kannada" },
    { "key": "kk", "value": "Kazakh" },
    { "key": "km", "value": "Khmer" },
    { "key": "ko", "value": "Korean" },
    { "key": "ku", "value": "Kurdish (Kurmanji)" },
    { "key": "ky", "value": "Kyrgyz" },
    { "key": "lo", "value": "Lao" },
    { "key": "la", "value": "Latin" },
    { "key": "lv", "value": "Latvian" },
    { "key": "lt", "value": "Lithuanian" },
    { "key": "lb", "value": "Luxembourgish" },
    { "key": "mk", "value": "Macedonian" },
    { "key": "mg", "value": "Malagasy" },
    { "key": "ms", "value": "Malay" },
    { "key": "ml", "value": "Malayalam" },
    { "key": "mt", "value": "Maltese" },
    { "key": "mi", "value": "Maori" },
    { "key": "mr", "value": "Marathi" },
    { "key": "mn", "value": "Mongolian" },
    { "key": "my", "value": "Myanmar (Burmese)" },
    { "key": "ne", "value": "Nepali" },
    { "key": "no", "value": "Norwegian" },
    { "key": "or", "value": "Odia" },
    { "key": "ps", "value": "Pashto" },
    { "key": "fa", "value": "Persian" },
    { "key": "pl", "value": "Polish" },
    { "key": "pt", "value": "Portuguese" },
    { "key": "pa", "value": "Punjabi" },
    { "key": "ro", "value": "Romanian" },
    { "key": "ru", "value": "Russian" },
    { "key": "sm", "value": "Samoan" },
    { "key": "gd", "value": "Scots Gaelic" },
    { "key": "sr", "value": "Serbian" },
    { "key": "st", "value": "Sesotho" },
    { "key": "sn", "value": "Shona" },
    { "key": "sd", "value": "Sindhi" },
    { "key": "si", "value": "Sinhala" },
    { "key": "sk", "value": "Slovak" },
    { "key": "sl", "value": "Slovenian" },
    { "key": "so", "value": "Somali" },
    { "key": "es", "value": "Spanish" },
    { "key": "su", "value": "Sundanese" },
    { "key": "sw", "value": "Swahili" },
    { "key": "sv", "value": "Swedish" },
    { "key": "tg", "value": "Tajik" },
    { "key": "ta", "value": "Tamil" },
    { "key": "te", "value": "Telugu" },
    { "key": "th", "value": "Thai" },
    { "key": "tr", "value": "Turkish" },
    { "key": "uk", "value": "Ukrainian" },
    { "key": "ur", "value": "Urdu" },
    { "key": "uz", "value": "Uzbek" },
    { "key": "vi", "value": "Vietnamese" },
    { "key": "cy", "value": "Welsh" },
    { "key": "xh", "value": "Xhosa" },
    { "key": "yi", "value": "Yiddish" },
    { "key": "yo", "value": "Yoruba" },
    { "key": "zu", "value": "Zulu" }
  ]

  const toResetData = () => {
      dispatch(resetData());
      dispatch(loadData());
      setModalVisible(false);
  }

  const toSelectLanguage = async (lang) => {
    dispatch(setLanguage({key: lang}));
  }

  return (
    <>
      <SafeAreaProvider>
        <SafeAreaView style={modalVisible ? styles.containerDisabled : styles.container}>
          <SelectList
            setSelected={(lang) => toSelectLanguage(lang)}
            data={data}
            defaultOption={data.find(lang => (lang.key == language.key))}
          />
          <TouchableHighlight underlayColor={'transparent'} onPress={() => setModalVisible(true)}>
            <View style={styles.reset}>
              <Text style={styles.text}>Daten zurücksetzen</Text>
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
                <Text style={styles.modalText}>Möchten Sie alle Daten löschen, einschließlich dessen, was Sie bereits richtig und falsch gemacht haben?</Text>
                <View style={styles.buttonContainer}>
                  <TouchableHighlight underlayColor={'transparent'} onPress={toResetData}>
                    <View style={styles.resetData}>
                      <Text style={styles.text}>Daten zurücksetzen</Text>
                    </View>
                  </TouchableHighlight>
                  <TouchableHighlight underlayColor={'transparent'} onPress={() => setModalVisible(false)}>
                    <View style={styles.cancle}>
                      <Text style={styles.cancleText}>Abbrechen</Text>
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

let styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingTop: 50,
  },
  containerDisabled: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingTop: 50,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    filter: "brightness(50%)"
  },
  button: {
    alignItems: 'center',
    padding: 10,
    margin: 5,
  },
  text: {
    color: "white"
  },
  countContainer: {
    alignItems: 'center',
    padding: 10,
  },
  reset: {
    backgroundColor: 'red',
    alignItems: 'center',
    padding: 10,
    margin: 5,
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
    width: "90%",
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'left',
  },
  buttonContainer: {
    flexDirection: "row",
    marginLeft: "auto",
    marginTop: 10
  },
  cancle: {
    padding: 10,
    width: "100%",
  },
  cancleText: {
    color: "black",
    opacity: 0.7

  },
  resetData: {
    padding: 10,
    backgroundColor: 'red',
    width: "100%",
    borderRadius: 5,
  }
});