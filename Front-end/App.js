import React from 'react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './app/theme';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './app/components/authGuard';
import MyStack from './app/components/navigation';
import { Alert } from 'react-native';
// Import Firestore utilities for automatic error monitoring
import './utils/firestoreUtils';

export default function App() {
  Alert.alert('DEBUG', 'Step 2: App component starting');
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <AuthGuard>
              <MyStack />
            </AuthGuard>
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  )
}