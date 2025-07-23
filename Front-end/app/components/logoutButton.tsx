import React from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const LogoutButton: React.FC = () => {
  const { signOut, user } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={{ marginRight: 15, padding: 5 }}
    >
      <FontAwesome name="sign-out" size={20} color="#007AFF" />
    </TouchableOpacity>
  );
};

export default LogoutButton;
