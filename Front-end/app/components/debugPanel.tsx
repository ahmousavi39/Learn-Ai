import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FirestoreManager } from '../../utils/firestoreUtils';

interface DebugPanelProps {
  visible?: boolean;
  onClose?: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ visible = false, onClose }) => {
  if (!visible) return null;

  const handleDisableFirestore = async () => {
    await FirestoreManager.disableFirestore();
    Alert.alert('Debug', 'Firestore completely terminated - no more connection attempts');
  };

  const handleEnableFirestore = () => {
    FirestoreManager.enableFirestore();
    Alert.alert('Debug', 'Firestore re-initialized and enabled');
  };

  const handleResetErrors = () => {
    FirestoreManager.resetErrorCount();
    Alert.alert('Debug', 'Error count reset');
  };

  const showErrorCount = () => {
    const count = FirestoreManager.getErrorCount();
    const isTerminated = FirestoreManager.isFirestoreTerminated();
    Alert.alert('Debug', `Current Firestore error count: ${count}\nFirestore terminated: ${isTerminated}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Debug Panel</Text>
        <Text style={styles.subtitle}>Firestore Connection Control</Text>
        
        <TouchableOpacity style={styles.button} onPress={handleDisableFirestore}>
          <Text style={styles.buttonText}>Disable Firestore</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleEnableFirestore}>
          <Text style={styles.buttonText}>Enable Firestore</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={showErrorCount}>
          <Text style={styles.buttonText}>Show Error Count</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleResetErrors}>
          <Text style={styles.buttonText}>Reset Error Count</Text>
        </TouchableOpacity>
        
        {onClose && (
          <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  closeButton: {
    backgroundColor: '#666',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default DebugPanel;
