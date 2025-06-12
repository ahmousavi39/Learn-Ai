import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faInfo, faGears } from '@fortawesome/free-solid-svg-icons'
import {
  useNavigation,
} from '@react-navigation/native';

export function RightHeaderHome() {
  const navigation = useNavigation();

  return (
    <>
      <View style={styles.icon1Container}>
        <Pressable style={styles.button} onPress={() => {
          navigation.navigate("Settings")
        }}>
          <FontAwesomeIcon size={19} icon={faGears} />
        </Pressable>
      </View>
    </>
  );
}

let styles = StyleSheet.create({
  icon1Container: {
    paddingRight: 10
  },
  icon2Container: {
    paddingLeft: 10,
  },
  button: {
    padding: 0,
    margin: 0,
  }
});