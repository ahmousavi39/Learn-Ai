import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Course, Home, RightHeaderHome, Settings, LeftHeader, ImageViewer } from '../../app/components';
import { Lesson } from '../../app/components/Pages/lesson';
import { QuestionRender } from '../../app/components/questionRender';
import { useTheme } from '../../app/theme';

export default function MyStack() {
    const Stack = createNativeStackNavigator();
    const { theme } = useTheme();

    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Home"
                component={Home}
                options={{
                    title: "Learn AI",
                    headerRight: () => <RightHeaderHome />,
                    headerTintColor: theme.headerTitle,
                    headerStyle: { backgroundColor: theme.headerBackground },
                }}
            />
            <Stack.Screen
                name="Course"
                component={Course}
                options={{
                    headerTitleAlign: "center",
                    headerLeft: () => <LeftHeader />,
                    headerTintColor: theme.headerTitle,
                    headerStyle: { backgroundColor: theme.headerBackground }
                }}
            />
            <Stack.Screen
                name="Lesson"
                component={Lesson}
                options={{
                    headerTitleAlign: "center",
                    headerLeft: () => <LeftHeader />,
                    headerTintColor: theme.headerTitle,
                    headerStyle: { backgroundColor: theme.headerBackground }
                }}
            />
            <Stack.Screen
                name="Test"
                component={QuestionRender}
                options={{
                    headerTitleAlign: "center",
                    headerLeft: () => <LeftHeader />,
                    headerTintColor: theme.headerTitle,
                    headerStyle: { backgroundColor: theme.headerBackground }
                }}
            />
            <Stack.Screen
                name="Settings"
                component={Settings}
                options={{
                    title: "Settings",
                    headerTintColor: theme.headerTitle,
                    headerStyle: { backgroundColor: theme.headerBackground }
                }}
            />
            <Stack.Screen name="ImageViewer" component={ImageViewer}  options={{
                    title: "",
                    headerTintColor: theme.headerTitle,
                    headerStyle: { backgroundColor: theme.headerBackground }
                }} />
        </Stack.Navigator>
    );
}