import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, Pressable, Animated, View, Dimensions } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { testDone } from '../../features/item/itemSlice';
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
    const { questions, courseId, sectionIndex } = route.params || [];
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

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.safeArea}>
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

                    <View>
                        {showResetButton && (
                            <Pressable style={styles.retryButton} onPress={resetWrongAnswer}>
                                <MaterialIcons name="refresh" size={36} color="#3730a3" />
                            </Pressable>
                        )}

                        <Pressable style={styles.nextButton} onPress={() => {
                            dispatch(testDone({ courseId, sectionIndex, testIndex: index }))
                            if (index + 1 < questions.length) {
                                setIndex(index + 1);
                                resetResult();
                                generation();
                            } else {
                                navigation.navigate('Course', {
                                    courseId,
                                    selectedSectionIndex: sectionIndex
                                });
                            }
                        }}>
                            <MaterialIcons name="navigate-next" size={36} color="#3730a3" />
                        </Pressable>
                    </View>

                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    container: {
        flex: 1,
        padding: 10,
        justifyContent: 'space-between', // spread question and options/buttons
    },

    questionWrapper: {
        marginTop: 40, // push question down a bit from top
        alignItems: 'center',
    },

    optionsContainer: {
        gap: 24,
        marginBottom: 150,  // add space at bottom for buttons
    },

    title: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 32,
        marginTop: 20,  // add some top margin
        color: '#222',
    },

    optionWrapper: {
        width: '100%',
    },
    optionButton: {
        backgroundColor: '#3b82f6',
        borderWidth: 2,
        borderColor: '#fff',
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
    bottomRightContainer: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        flexDirection: 'row',   // changed from default (column)
        alignItems: 'center',
        gap: 12,
    },


    retryButton: {
        position: 'absolute',
        right: 20,
        bottom: 70,
        backgroundColor: 'transparent',
    },

    nextButton: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: 'transparent',
    },

});
