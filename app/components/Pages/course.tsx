import React, { useEffect, useState } from 'react';
import { selectCourses } from '../../../features/item/itemSlice';
import { useAppDispatch, useAppSelector } from '../../hook';
import {
    SafeAreaProvider,
    SafeAreaView
} from 'react-native-safe-area-context';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function Course({ route, navigation }) {
    const dispatch = useAppDispatch();
    const courses = useAppSelector(selectCourses);
    const [sections, setSections] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const { courseId, selectedSectionIndex } = route.params || {};

    useEffect(() => {
        const course = courses.find(course => course.id === courseId);
        if (course) setSections(course.sections);
        console.log(selectedSectionIndex)
        if (selectedSectionIndex >= 0) setExpandedIndex(selectedSectionIndex + 1)
    }, [courses, courseId]);

    const toggleSection = (index: number) => {
        setExpandedIndex(prev => (prev === index ? null : index));
    };

    const openLesson = (sectionIndex, contentIndex) => {
        navigation.navigate('Lesson', {
            courseId,
            sectionIndex,
            contentIndex
        });
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.container}>
                    {sections.map((section, index) => {
                        const isTestDone = Array.isArray(section.test) && section.test.every(t => t.isDone);
                        const isContentDone = Array.isArray(section.content) && section.content.every(t => t.isDone);
                        return (
                            <View key={index}>
                                {/* Main Section Button */}
                                <TouchableHighlight
                                    underlayColor="transparent"
                                    style={styles.touchableHighlight}
                                    onPress={() => toggleSection(index)}
                                >
                                    <View style={styles.button}>
                                        <Text style={styles.text}>{section.title}</Text>
                                        {isContentDone && (
                                            <Ionicons name="checkmark-circle" size={20} color="green" />
                                        )}
                                    </View>
                                </TouchableHighlight>

                                {/* Expand to Show Content */}
                                {expandedIndex === index && Array.isArray(section.content) && (
                                    <View style={styles.subItemContainer}>
                                        {section.content.map((item, subIndex) => (
                                            <TouchableHighlight
                                                key={subIndex}
                                                underlayColor="#eee"
                                                style={styles.subItem}
                                                onPress={() => openLesson(index, subIndex)}
                                            >
                                                <>
                                                    <Text style={styles.subItemText}>{item.title}</Text>
                                                    {item.isDone && (
                                                        <Ionicons name="checkmark-circle" size={20} color="green" />
                                                    )}
                                                </>
                                            </TouchableHighlight>
                                        ))}

                                        <TouchableHighlight
                                            underlayColor="#eee"
                                            style={styles.testButton}
                                            onPress={() => {
                                                navigation.navigate("Test", { questions: section.test, courseId, sectionIndex: index });
                                            }}
                                        >
                                            <>
                                                <Text style={styles.subItemText}>Test</Text>
                                                {isTestDone && (
                                                    <Ionicons name="checkmark-circle" size={20} color="green" />
                                                )}
                                            </>
                                        </TouchableHighlight>
                                    </View>
                                )}
                            </View>
                        )
                    })}
                </ScrollView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        padding: 16
    },
    touchableHighlight: {
        alignItems: 'center',
        paddingBottom: 10,
        width: '100%',
    },
    text: {
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingTop: 35,
        paddingBottom: 35,
        paddingRight: 20,
        paddingLeft: 20,
        width: '100%',
        height: 100,
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
          flexDirection: 'row',
        justifyContent: 'space-between',

    },
    buttonContainer: {
        flexDirection: "row",
        marginLeft: "auto",
        marginTop: 10
    },
    subItemContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomRightRadius: 10,
        borderBottomLeftRadius: 10,
        marginTop: -10,
        marginBottom: 15,
    },

    subItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    subItemText: {
        fontSize: 16,
        color: '#333',
    },
    testButton: {
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    }
});