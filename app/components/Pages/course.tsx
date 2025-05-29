import React, { useEffect, useState } from 'react';
import { selectCourses, openLocation } from '../../../features/item/itemSlice';
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
    const [language, setLanguage] = useState('en');
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const { courseId, selectedSectionIndex } = route.params || {};

    useEffect(() => {
        const course = courses.find(course => course.id === courseId);
        if (course) setSections(course.sections);
        if (course.language) setLanguage(course.language);
        if (selectedSectionIndex >= 0) setExpandedIndex(selectedSectionIndex);
    }, [courses, courseId]);

    const toggleSection = (index: number) => {
        setExpandedIndex(prev => (prev === index ? null : index));
    };

    const openLesson = (sectionIndex, contentIndex) => {
        dispatch(openLocation({ courseId, sectionIndex: expandedIndex, contentIndex, isTest: false }))
        navigation.navigate('Lesson', {
            courseId,
            sectionIndex,
            contentIndex,
            language
        });
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={language === "fa" ? styles.containerPersian : styles.container}>
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
                                    {language === "fa" ? <View style={styles.button}>
                                        <View style={styles.iconContainer}>
                                            <Ionicons name="checkmark-circle" size={20} color="green" style={!isContentDone || !isTestDone ? { display: "none" } : {}} />
                                        </View>
                                        <Text style={styles.text}>{section.title}</Text>
                                    </View> : <View style={styles.button}>
                                        <Text style={styles.text}>{section.title}</Text>
                                        <View style={styles.iconContainer}>
                                            <Ionicons name="checkmark-circle" size={20} color="green" style={!isContentDone || !isTestDone ? { display: "none" } : {}} />
                                        </View>
                                    </View>}

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
                                                {language === "fa" ?
                                                    <View style={styles.subButton}>
                                                        <View style={styles.iconContainer}>
                                                            <Ionicons name="checkmark-circle" size={20} color="green" style={!item.isDone ? { display: "none" } : {}} />
                                                        </View>
                                                        <Text style={styles.subItemText}>{item.title}</Text>
                                                    </View> :
                                                    <View style={styles.subButton}>
                                                        <Text style={styles.subItemText}>{item.title}</Text>
                                                        <View style={styles.iconContainer}>
                                                            <Ionicons name="checkmark-circle" size={20} color="green" style={!item.isDone ? { display: "none" } : {}} />
                                                        </View>
                                                    </View>}
                                            </TouchableHighlight>
                                        ))}

                                        <TouchableHighlight
                                            underlayColor="#eee"
                                            style={styles.testButton}
                                            onPress={() => {
                                                dispatch(openLocation({ courseId, sectionIndex: index, contentIndex: null, isTest: true }))
                                                navigation.navigate("Test", { questions: section.test, courseId, sectionIndex: index });
                                            }}
                                        >

                                              {language === "fa" ?
                                                    <View style={styles.subButton}>
                                                        <View style={styles.iconContainer}>
                                                            <Ionicons name="checkmark-circle" size={20} color="green" style={!isTestDone ? { display: "none" } : {}} />
                                                        </View>
                                                <Text style={styles.subItemText}>{"آزمون"}</Text>
                                                    </View> :
                                                    <View style={styles.subButton}>
                                                <Text style={styles.subItemText}>{language === "ru" ? "викторина" : language === "de" ? "Quiz" : language === "es" ? "cuestionario" : language === "fr" ? "questionnaire" : language === "fa" ? "آزمون" : "Quiz"}</Text>
                                                        <View style={styles.iconContainer}>
                                                            <Ionicons name="checkmark-circle" size={20} color="green" style={!isTestDone ? { display: "none" } : {}} />
                                                        </View>
                                                    </View>}
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
        padding: 16,
        textAlign: 'left',
        writingDirection: 'ltr'
    },
    containerPersian: {
        justifyContent: 'center',
        padding: 16,
        textAlign: 'right',
        writingDirection: 'rtl'
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
        paddingHorizontal: 30,
        width: '100%',
        height: 100,
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    subButton: {
        backgroundColor: 'transparent',
        alignItems: 'center',
        width: '100%',
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingVertical: 5,
        justifyContent: 'space-between'
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
    },
    iconContainer: {
        width: 24
    }
});