import React from 'react';
import { Modal, View, Image, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme'; // Assuming you have a useTheme hook

export function ImageViewer({ route, navigation }) {
  const { imageUrl } = route.params;
  const { theme } = useTheme(); // Get theme for styling

  const styles = getStyles(theme);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true} // Always true when this component is rendered
      onRequestClose={() => navigation.goBack()}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={30} color={theme.text} />
        </Pressable>
        <Image
          source={{ uri: imageUrl }}
          style={styles.fullScreenImage}
          resizeMode="contain"
        />
      </SafeAreaView>
    </Modal>
  );
}

function getStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background, // Use theme background
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullScreenImage: {
      width: '100%',
      height: '100%',
    },
    closeButton: {
      position: 'absolute',
      top: 20, // Adjust as needed for safe area
      right: 20,
      zIndex: 1, // Ensure the button is above the image
      padding: 10,
    },
  });
}