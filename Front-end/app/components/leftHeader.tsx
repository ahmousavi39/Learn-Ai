import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import {
    useNavigation,
} from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../hook';
import { selectCurrentLocation, openLocation } from '../../features/item/itemSlice';

export function LeftHeader() {
    const dispatch = useAppDispatch();
    const currentLocation = useAppSelector(selectCurrentLocation);
    const navigation = useNavigation();

    return (
        <>
            <View style={styles.icon1Container}>
                <Pressable style={styles.button} onPress={() => {
                    if (currentLocation.isTest || currentLocation.contentIndex !== null) {
                        dispatch(openLocation({courseId: currentLocation.courseId, contentIndex: null, isTest: false, sectionIndex: currentLocation.sectionIndex}))
                        navigation.navigate('Course', {
                            courseId: currentLocation.courseId,
                            selectedSectionIndex: currentLocation.sectionIndex
                        })
                    } else {
                        navigation.navigate('Home')
                    }
                }}>
                    <FontAwesomeIcon size={19} icon={faChevronLeft} />
                </Pressable>
            </View>
        </>
    );
}

let styles = StyleSheet.create({
    icon1Container: {
        paddingRight: 10
    },
    icon2Container: {
        paddingLeft: 10,
    },
    button: {
        padding: 0,
        margin: 0,
    }
});