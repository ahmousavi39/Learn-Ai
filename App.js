import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { Course, Home, RightHeaderHome, Settings, LeftHeader } from './app/components';
import { store } from './app/store';
import { NavigationContainer } from '@react-navigation/native';
import { Lesson } from './app/components/Pages/lesson';
import { QuestionRender } from './app/components/questionRender';

export default function App() {

  const Stack = createNativeStackNavigator();

  function MyStack() {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={Home}
          options={{
            title: "Learn AI",
            headerRight: () => <RightHeaderHome />,
          }}
        />
        <Stack.Screen
          name="Course"
          component={Course}
          options={{
            headerTitleAlign: "center",
            headerLeft: () => <LeftHeader />,
          }}
        />
        <Stack.Screen
          name="Lesson"
          component={Lesson}
          options={{
            headerTitleAlign: "center",
            headerLeft: () => <LeftHeader />,
          }}
        />
        <Stack.Screen
          name="Test"
          component={QuestionRender}
          options={{
            headerTitleAlign: "center",
            headerLeft: () => <LeftHeader />,
          }}
        />
        <Stack.Screen
          name="Settings"
          component={Settings}
          options={{
            title: "Settings",
          }}
        />
      </Stack.Navigator>
    );
  }


  return (
    <Provider store={store}>
      <NavigationContainer>
        <MyStack />
      </NavigationContainer>
    </Provider>)

}
