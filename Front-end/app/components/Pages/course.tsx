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
import { useTheme } from '../../theme';

export function Course({ route, navigation }) {
    const dispatch = useAppDispatch();
    const courses = useAppSelector(selectCourses);
    const [sections, setSections] = useState([]);
    const [language, setLanguage] = useState('en');
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const { theme } = useTheme();
    const styles = getStyles(theme);

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

    const quizTranslations = [
        { key: "af", value: "Vraelys" },
        { key: "sq", value: "Kviz" },
        { key: "am", value: "ፈተና" },
        { key: "ar", value: "اختبار" },
        { key: "hy", value: "Քվիզ" },
        { key: "az", value: "Quiz" },
        { key: "eu", value: "Txapelketa" },
        { key: "be", value: "Квіз" },
        { key: "bn", value: "কুইজ" },
        { key: "bs", value: "Kviz" },
        { key: "bg", value: "Квиз" },
        { key: "ca", value: "Qüestionari" },
        { key: "ceb", value: "Pangutana" },
        { key: "ny", value: "Mayeso" },
        { key: "zh", value: "测验" },
        { key: "zh-TW", value: "測驗" },
        { key: "co", value: "Quiz" },
        { key: "hr", value: "Kviz" },
        { key: "cs", value: "Kvíz" },
        { key: "da", value: "Quiz" },
        { key: "nl", value: "Quiz" },
        { key: "en", value: "Quiz" },
        { key: "eo", value: "Kvizo" },
        { key: "et", value: "Viktoriin" },
        { key: "tl", value: "Pagsusulit" },
        { key: "fi", value: "Visa" },
        { key: "fr", value: "Quiz" },
        { key: "fy", value: "Quiz" },
        { key: "gl", value: "Questionario" },
        { key: "ka", value: "კვიზი" },
        { key: "de", value: "Quiz" },
        { key: "el", value: "Κουίζ" },
        { key: "gu", value: "ક્વિઝ" },
        { key: "ht", value: "Kwiz" },
        { key: "ha", value: "Tambaya" },
        { key: "haw", value: "Nīnau" },
        { key: "iw", value: "מבחן" },
        { key: "hi", value: "क्विज़" },
        { key: "hmn", value: "Kev Xeem" },
        { key: "hu", value: "Kvíz" },
        { key: "is", value: "Spurningakeppni" },
        { key: "ig", value: "Ajụjụ" },
        { key: "id", value: "Kuis" },
        { key: "ga", value: "Cuirs" },
        { key: "it", value: "Quiz" },
        { key: "ja", value: "クイズ" },
        { key: "jw", value: "Kuis" },
        { key: "kn", value: "ಕ್ವಿಜ್" },
        { key: "kk", value: "Тест" },
        { key: "km", value: "វាយតម្លៃ" },
        { key: "ko", value: "퀴즈" },
        { key: "ku", value: "Lêkolîn" },
        { key: "ky", value: "Тест" },
        { key: "lo", value: "ການທົດສອບ" },
        { key: "la", value: "Probatio" },
        { key: "lv", value: "Viktorīna" },
        { key: "lt", value: "Kvizas" },
        { key: "lb", value: "Quiz" },
        { key: "mk", value: "Квиз" },
        { key: "mg", value: "Fanadinana" },
        { key: "ms", value: "Kuis" },
        { key: "ml", value: "ക്വിസ്" },
        { key: "mt", value: "Quiz" },
        { key: "mi", value: "Pātai" },
        { key: "mr", value: "क्विझ" },
        { key: "mn", value: "Шалгалт" },
        { key: "my", value: "ပြိုင်ပွဲ" },
        { key: "ne", value: "क्विज" },
        { key: "no", value: "Quiz" },
        { key: "or", value: "କୁଇଜ୍" },
        { key: "ps", value: "پوښتنه" },
        { key: "fa", value: "آزمون" },
        { key: "pl", value: "Quiz" },
        { key: "pt", value: "Questionário" },
        { key: "pa", value: "ਕਵਿਜ਼" },
        { key: "ro", value: "Chestionar" },
        { key: "ru", value: "Викторина" },
        { key: "sm", value: "Fautuaga" },
        { key: "gd", value: "Deuchainn" },
        { key: "sr", value: "Квиз" },
        { key: "st", value: "Tlhahlobo" },
        { key: "sn", value: "Mubvunzo" },
        { key: "sd", value: "سوال" },
        { key: "si", value: "ප්‍රශ්නෝත්තරය" },
        { key: "sk", value: "Kvíz" },
        { key: "sl", value: "Kviz" },
        { key: "so", value: "Imtixaan" },
        { key: "es", value: "Cuestionario" },
        { key: "su", value: "Kuis" },
        { key: "sw", value: "Mtihani" },
        { key: "sv", value: "Quiz" },
        { key: "tg", value: "Озмоиш" },
        { key: "ta", value: "வினாடி வினா" },
        { key: "te", value: "క్విజ్" },
        { key: "th", value: "แบบทดสอบ" },
        { key: "tr", value: "Sınav" },
        { key: "uk", value: "Квіз" },
        { key: "ur", value: "کوئز" },
        { key: "uz", value: "Test" },
        { key: "vi", value: "Bài trắc nghiệm" },
        { key: "cy", value: "Cwis" },
        { key: "xh", value: "Uvavanyo" },
        { key: "yi", value: "קװיז" },
        { key: "yo", value: "Idanwo" },
        { key: "zu", value: "Isivivinyo" }
    ];

    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
                <ScrollView contentContainerStyle={["ar", "fa", "he", "iw", "ur", "ps", "sd", "yi"].includes(language) ? styles.containerPersian : styles.container}>
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
                                    {["ar", "fa", "he", "iw", "ur", "ps", "sd", "yi"].includes(language) ? <View style={styles.button}>
                                        <View style={styles.iconContainer}>
                                            <Ionicons name="checkmark-circle" size={20} color={theme.progress} style={!isContentDone || !isTestDone ? { display: "none" } : {}} />
                                        </View>
                                        <Text style={styles.text}>{section.title}</Text>
                                    </View> : <View style={styles.button}>
                                        <Text style={styles.text}>{section.title}</Text>
                                        <View style={styles.iconContainer}>
                                            <Ionicons name="checkmark-circle" size={20} color={theme.progress} style={!isContentDone || !isTestDone ? { display: "none" } : {}} />
                                        </View>
                                    </View>}

                                </TouchableHighlight>

                                {expandedIndex === index && Array.isArray(section.content) && (
                                    <View style={styles.subItemContainer}>
                                        {section.content.map((item, subIndex) => (
                                            <TouchableHighlight
                                                key={subIndex}
                                                underlayColor={theme.sectionSelectedBackground}
                                                style={styles.subItem}
                                                onPress={() => openLesson(index, subIndex)}
                                            >
                                                {["ar", "fa", "he", "iw", "ur", "ps", "sd", "yi"].includes(language) ?
                                                    <View style={styles.subButton}>
                                                        <View style={styles.iconContainer}>
                                                            <Ionicons name="checkmark-circle" size={20} color={theme.progress} style={!item.isDone ? { display: "none" } : {}} />
                                                        </View>
                                                        <Text style={styles.subItemText}>{item.title}</Text>
                                                    </View> :
                                                    <View style={styles.subButton}>
                                                        <Text style={styles.subItemText}>{item.title}</Text>
                                                        <View style={styles.iconContainer}>
                                                            <Ionicons name="checkmark-circle" size={20} color={theme.progress} style={!item.isDone ? { display: "none" } : {}} />
                                                        </View>
                                                    </View>}
                                            </TouchableHighlight>
                                        ))}

                                        <TouchableHighlight
                                            underlayColor={theme.sectionSelectedBackground}
                                            style={styles.testButton}
                                            onPress={() => {
                                                dispatch(openLocation({ courseId, sectionIndex: index, contentIndex: null, isTest: true }))
                                                navigation.navigate("Test", { questions: section.test, courseId, sectionIndex: index, language });
                                            }}
                                        >

                                            {["ar", "fa", "he", "iw", "ur", "ps", "sd", "yi"].includes(language) ?
                                                <View style={styles.subButton}>
                                                    <View style={styles.iconContainer}>
                                                        <Ionicons name="checkmark-circle" size={20} color={theme.progress} style={!isTestDone ? { display: "none" } : {}} />
                                                    </View>
                                                    <Text style={styles.subItemText}>{(quizTranslations.find(t => t.key === language)?.value) || "Quiz"}</Text>
                                                </View> :
                                                <View style={styles.subButton}>
                                                    <Text style={styles.subItemText}>{(quizTranslations.find(t => t.key === language)?.value) || "Quiz"}</Text>
                                                    <View style={styles.iconContainer}>
                                                        <Ionicons name="checkmark-circle" size={20} color={theme.progress} style={!isTestDone ? { display: "none" } : {}} />
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

function getStyles(theme) {
  return StyleSheet.create({    
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
        width: '100%'
    },
    text: {
        fontSize: 16,
        color: theme.text
    },
    button: {
        backgroundColor: theme.sectionBackground,
        alignItems: 'center',
        paddingTop: 35,
        paddingBottom: 35,
        paddingHorizontal: 30,
        width: '100%',
        height: 100,
        borderTopRightRadius: 10,
        borderTopLeftRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
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
        backgroundColor: theme.sectionBackground,
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
        borderBottomColor: theme.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 10
    },

    subItemText: {
        fontSize: 16,
        color: theme.text
    },
    testButton: {
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 10
    },
    iconContainer: {
        width: 24
    }
  });
}