import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, Pressable, Animated, View, Dimensions } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { testDone, openLocation } from '../../features/item/itemSlice';
import { useAppDispatch, useAppSelector } from '../hook';

async function correctSound() {
    const { sound } = await Audio.Sound.createAsync(require('../../assets/correct.mp3'));
    await sound.playAsync();
}

async function wrongSound() {
    const { sound } = await Audio.Sound.createAsync(require('../../assets/wrong.mp3'));
    await sound.playAsync();
}

export function QuestionRender({ route, navigation }) {
    const { questions, courseId, sectionIndex, language } = route.params || [];
    const [isOption0, setIsOption0] = useState(null);
    const [isOption1, setIsOption1] = useState(null);
    const [isOption2, setIsOption2] = useState(null);
    const [isOption3, setIsOption3] = useState(null);

    const [question, setQuestion] = useState('');
    const [index, setIndex] = useState(0);
    const [isDisabledState, setIsDisabledState] = useState(false);
    const [options, setOptions] = useState([]);
    const [isDisabled, setIsDisabled] = useState(false);
    const [showResetButton, setShowResetButton] = useState(false);

    const backgroundColorRef = useState(new Animated.Value(0))[0];
    const borderColorRef = useState(new Animated.Value(0))[0];
    const dispatch = useAppDispatch();
    const courses = useAppSelector(state => state.item.courses);

    const handlePress = () => {
        Animated.timing(backgroundColorRef, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();

        Animated.timing(borderColorRef, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleRelease = () => {
        Animated.timing(backgroundColorRef, {
            toValue: 0,
            duration: 30,
            useNativeDriver: false,
        }).start();

        Animated.timing(borderColorRef, {
            toValue: 0,
            duration: 60,
            useNativeDriver: false,
        }).start();
    };

    const backgroundColorCorrect = backgroundColorRef.interpolate({
        inputRange: [0, 1],
        outputRange: ['#3b82f6', '#16a34a'],
    });

    const backgroundColorFalse = backgroundColorRef.interpolate({
        inputRange: [0, 1],
        outputRange: ['#3b82f6', '#dc2626'],
    });

    const borderColorTrue = borderColorRef.interpolate({
        inputRange: [0, 1],
        outputRange: ['#fff', '#16a34a'],
    });

    const borderColorFalse = borderColorRef.interpolate({
        inputRange: [0, 1],
        outputRange: ['#fff', '#dc2626'],
    });
    const shuffleArray = (array) => {
        return array
            .map((value) => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);
    };

    const generation = () => {
        const currentQuestion = questions[index];
        const shuffledOptions = shuffleArray([...currentQuestion.options]);
        setOptions(shuffledOptions);
        setQuestion(currentQuestion.question);
    };


    useEffect(() => {
        if (questions.length > 0) {
            generation();
            resetResult();
        }
    }, [index]);


    useEffect(() => {
        if (!isDisabled) {
            handleRelease();
            setIsDisabledState(false);
            setIsOption0(null);
            setIsOption1(null);
            setIsOption2(null);
            setIsOption3(null);
        } else {
            setIsDisabledState(true);
        }
    }, [isDisabled]);

    const resetResult = () => {
        setIsDisabled(false);
        setShowResetButton(false);
    };

    const showResult = (isCorrect, option) => {
        setIsDisabled(true);
        if (!isCorrect) setShowResetButton(true);

        [setIsOption0, setIsOption1, setIsOption2, setIsOption3][option](isCorrect);
    };

    const normalize = (str) => (str || '').toString().trim().toLowerCase();

    const onHandle = (title, option) => {
        const isCorrect = normalize(title) === normalize(questions[index].answer);
        showResult(isCorrect, option);
        dispatch(testDone({ courseId, sectionIndex, testIndex: index }))
        handlePress();
        if (isCorrect) {
            correctSound();
            setTimeout(() => {
                if (index + 1 < questions.length) {
                    setIndex(index + 1);
                    resetResult();
                    generation();
                    handleRelease();
                } else {
                    navigation.goBack();
                }
            }, 2000);
        } else {
            wrongSound();
        }

    };

    const resetWrongAnswer = () => {
        resetResult();
        handleRelease();
    };

    const goToPrevious = () => {
        if (index > 0) {
            // Go to previous test question
            setIndex(index - 1);
            resetResult();
            generation();
        } else {
            // We're at the first test question
            const course = courses.find(c => c.id === courseId); if (!course) return;

            const section = course.sections[sectionIndex];
            if (!section) return;

            if (section.content && section.content.length > 0) {
                // Go to last content item
                const lastContentIndex = section.content.length - 1;
                dispatch(openLocation({ courseId, sectionIndex, contentIndex: lastContentIndex, isTest: false }));
                navigation.navigate('Lesson', {
                    courseId,
                    sectionIndex,
                    contentIndex: lastContentIndex,
                    language
                });
            } else {
                // No content, just go back to course
                navigation.navigate('Course', {
                    courseId,
                    selectedSectionIndex: sectionIndex,
                });
            }
        }
    };

    const goToNext = () => {
        dispatch(testDone({ courseId, sectionIndex, testIndex: index }))
        if (index + 1 < questions.length) {
            setIndex(index + 1);
            resetResult();
            generation();
        } else {
            dispatch(openLocation({ courseId, sectionIndex, contentIndex: null, isTest: false }))

            navigation.navigate('Course', {
                courseId,
                selectedSectionIndex: sectionIndex + 1
            });
        }
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.container}>

                    <View style={styles.questionWrapper}>
                        <Text style={styles.title}>{question}</Text>
                    </View>

                    <View style={styles.optionsContainer}>
                        {[0, 1, 2, 3].map((i) => (
                            <Pressable key={i} disabled={isDisabledState} onPress={() => onHandle(options[i], i)} style={styles.optionWrapper}>
                                <Animated.View
                                    style={[
                                        styles.optionButton,
                                        (i === 0 && isOption0 !== null) && { backgroundColor: isOption0 ? backgroundColorCorrect : backgroundColorFalse, borderColor: isOption0 ? borderColorTrue : borderColorFalse },
                                        (i === 1 && isOption1 !== null) && { backgroundColor: isOption1 ? backgroundColorCorrect : backgroundColorFalse, borderColor: isOption1 ? borderColorTrue : borderColorFalse },
                                        (i === 2 && isOption2 !== null) && { backgroundColor: isOption2 ? backgroundColorCorrect : backgroundColorFalse, borderColor: isOption2 ? borderColorTrue : borderColorFalse },
                                        (i === 3 && isOption3 !== null) && { backgroundColor: isOption3 ? backgroundColorCorrect : backgroundColorFalse, borderColor: isOption3 ? borderColorTrue : borderColorFalse },
                                    ]}
                                >
                                    <Text style={styles.optionText}>{options[i]}</Text>
                                </Animated.View>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.footer}>
                        {showResetButton && (
                            <Pressable style={styles.retryTextButton} onPress={resetWrongAnswer}>
                                <MaterialIcons name="refresh" size={36} color="white" />
                            </Pressable>
                        )}
                        <Pressable style={styles.nextButton} onPress={language === "fa" ? goToPrevious : goToNext}>
                            <MaterialIcons name="navigate-next" size={36} color="#3730a3" />
                        </Pressable>
                        <Pressable style={styles.backButton} onPress={language === "fa" ? goToNext : goToPrevious}>
                            <MaterialIcons name="navigate-before" size={36} color="#3730a3" />
                        </Pressable>
                    </View>
                </View>

            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // paddingHorizontal: 10,
        paddingVertical: 10,
        justifyContent: 'space-between', // spread question and options/buttons
    },

    questionWrapper: {
        marginTop: 40, // push question down a bit from top
        alignItems: 'center',
        paddingHorizontal: 10
    },

    optionsContainer: {
        gap: 24,
        bottom: 170,  // add space at bottom for buttons
    },

    title: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 20,  // add some top margin
        color: '#222',
    },

    optionWrapper: {
        width: '100%',
        paddingHorizontal: 10
    },
    optionButton: {
        backgroundColor: '#3b82f6',
        borderWidth: 2,
        borderColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    optionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    actions: {
        marginTop: 30,
        alignItems: 'center',
        gap: 12,
    },

    retryTextButton: {
        alignSelf: 'center',
        position: 'absolute',
        backgroundColor: '#16a34a',
        paddingHorizontal: 48,
        paddingVertical: 2,
        borderRadius: 8,
        marginVertical: "auto",
    },
    nextButton: {
        position: 'absolute',
        right: 20,
        backgroundColor: 'transparent',
        marginVertical: "auto",
    },
    backButton: {
        position: 'absolute',
        left: 20,
        backgroundColor: 'transparent',
        marginVertical: "auto",
    },
    footer: {
        width: "100%",
        height: 90,
        backgroundColor: "",
        position: 'absolute',
        bottom: 0
    }

});
