import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAllKeys, getItem, putItem, removeItem } from '../../app/services/AsyncStorage';
import * as backupData from '../../data.json';
import type { RootState } from '../../app/store'


interface SectionObjectState {
    title: string;
    content: {
        title: string;
        id: number,
        bulletpoints: string[];
        image: string;
        isDone: boolean;
    }[];
    test: {
        id: number,
        isDone: boolean,
        question: string;
        answer: string;
        options: string[];
    }[];
}

interface CoursesObjectState {
    id: number;
    name: string;
    language: string;
    level: string;
    sections: SectionObjectState[];
}

interface ItemState {
    courses: CoursesObjectState[];
    isLoading: boolean;
    coursesList: { name: string; id: number }[];
    currentLocation: { courseId: number | null, sectionIndex: number | null, contentIndex: number | null, isTest: boolean }
}

const initialState: ItemState = {
    courses: [],
    isLoading: false,
    coursesList: [],
    currentLocation: { courseId: null, sectionIndex: null, contentIndex: null, isTest: false }
}

export const loadData = createAsyncThunk('data/loadData', async () => {
    if ((await getAllKeys()).includes("courses")) {
        const coursesList = await getItem('coursesList');
        const courses = await getItem('courses');
        return { coursesList, courses };
    } else {
        return { coursesList: [], courses: [] };
    }
});

export const itemSlice = createSlice({
    name: 'item',
    initialState,
    reducers: {
        generateCourse: (state, action: PayloadAction<{ name: string, sections: SectionObjectState[], language: string, level: string }>) => {
            let id = 0;
            if (state.coursesList.length > 0) {
                id = state.coursesList.slice(-1)[0].id + 1;
            }
            const coursesListData = [...state.coursesList, { name: action.payload.name, id }];
            state.coursesList = coursesListData;
            const coursesData = [...state.courses, { sections: action.payload.sections, id, name: action.payload.name, language: action.payload.language, level: action.payload.level }];
            state.courses = coursesData;

            const pushData = async () => {
                await putItem('coursesList', coursesListData);
                await putItem('courses', coursesData);
            }
            pushData();
            state.isLoading = false;
        },
        updateData: (state) => {
            const pushData = async () => {
                await putItem('courses', state.courses);
            }
            pushData();
        },
        testDone: (state, action: PayloadAction<{ courseId: number, sectionIndex: number, testIndex: number }>) => {
            let courseInd;
            state.courses.map((course, courseIndex) => {
                if (course.id == action.payload.courseId) {
                    courseInd = courseIndex;
                    state.courses[courseIndex].sections[action.payload.sectionIndex].test[action.payload.testIndex].isDone = true;
                }
            })
            const pushData = async () => {
                await putItem('courses', state.courses);
            };
            pushData();
        },
        lessonDone: (state, action: PayloadAction<{ courseId: number, sectionIndex: number, contentIndex: number }>) => {
            let courseInd;
            state.courses.map((course, courseIndex) => {
                if (course.id == action.payload.courseId) {
                    courseInd = courseIndex;
                    state.courses[courseIndex].sections[action.payload.sectionIndex].content[action.payload.contentIndex].isDone = true;
                }
            })
            const pushData = async () => {
                await putItem('courses', state.courses);
            };
            pushData();
        },
        resetData: (state) => {
            state.coursesList = [];
            state.courses = [];
            const removeData = async () => {
                await removeItem('coursesList');
                await removeItem('courses');
            }
            removeData();
        },
        openLocation: (state, action: PayloadAction<{ courseId: number, sectionIndex: number, contentIndex: number, isTest: boolean }>) => {
            const { courseId, sectionIndex, contentIndex, isTest } = action.payload || null;
            state.currentLocation = { courseId, sectionIndex, contentIndex, isTest };
        },
        regenerateLesson: (state, action: PayloadAction<{ courseId: number, sectionIndex: number, contentIndex: number, newBulletpoints: string[] }>) => {
            state.courses.map((course, courseIndex) => {
                if (course.id == action.payload.courseId) {
                    state.courses[courseIndex].sections[action.payload.sectionIndex].content[action.payload.contentIndex].bulletpoints = action.payload.newBulletpoints;

                }
            })
            const pushData = async () => {
                await putItem('courses', state.courses);
            };
            pushData();
        }
    },
    extraReducers: (builder) => {
        builder.addCase(loadData.fulfilled, (state, action) => {
            state.coursesList = action.payload.coursesList;
            state.courses = action.payload.courses;
        });
    },
});

export const { generateCourse, updateData, resetData, testDone, lessonDone, openLocation, regenerateLesson } = itemSlice.actions;

export const selectIsItemLoading = (state: RootState) => state.item.isLoading;
export const selectCourses = (state: RootState) => state.item.courses;
export const selectCoursesList = (state: RootState) => state.item.coursesList;
export const selectCurrentLocation = (state: RootState) => state.item.currentLocation;

export default itemSlice.reducer;