import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import LoginScreen from './login';
import CourseGenerationLimit from './courseGenerationLimit';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, canGenerateCourse } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Allow access for both authenticated and anonymous users
  if (user) {
    return <>{children}</>;
  }

  // No user at all (shouldn't happen as we auto-sign in anonymously)
  return (
    <LoginScreen
      onLoginSuccess={() => {
        // User state will be updated by AuthContext
      }}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});

export default AuthGuard;
