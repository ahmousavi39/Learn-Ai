import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faInfo, faGears, faCrown } from '@fortawesome/free-solid-svg-icons'
import {
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '../../app/theme';

interface RightHeaderHomeProps {
  onPremiumPress?: () => void;
}

export function RightHeaderHome({ onPremiumPress }: RightHeaderHomeProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handlePremiumPress = () => {
    if (onPremiumPress) {
      onPremiumPress();
    } else {
      console.log('Premium icon clicked from header - no handler provided');
    }
  };

  return (
    <View style={styles.container}>
      {/* Premium Icon */}
      <View style={styles.iconContainer}>
        <Pressable style={styles.button} onPress={handlePremiumPress}>
          <FontAwesomeIcon size={19} icon={faCrown} color={theme.headerTitle}/>
        </Pressable>
      </View>
      
      {/* Settings Icon */}
      <View style={styles.iconContainer}>
        <Pressable style={styles.button} onPress={() => {
          navigation.navigate("Settings" as never)
        }}>
          <FontAwesomeIcon size={19} icon={faGears} color={theme.headerTitle}/>
        </Pressable>
      </View>
    </View>
  );
}

let styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    paddingHorizontal: 8,
  },
  button: {
    padding: 4,
    margin: 0
  }
});