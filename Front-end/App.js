import React from 'react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './app/theme';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './app/components/authGuard';
import MyStack from './app/components/navigation';

export default function App() {
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