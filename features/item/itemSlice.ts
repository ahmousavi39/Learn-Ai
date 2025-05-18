import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAllKeys, getItem, putItem, removeItem } from '../../app/services/AsyncStorage';
import * as backupData from '../../data.json';
import type { RootState } from '../../app/store'


interface SectionObjectState {
    title: string;
    content: {
        title: string;
        id: number,
        bulletpoint: string[];
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
    sections: SectionObjectState[];
}

interface ItemState {
    courses: CoursesObjectState[];
    isLoading: boolean;
    coursesList: { name: string; id: number }[];
    currentLocation: {courseId: number, sectionIndex: number, contentIndex: number, isTest: boolean}
}

const initialState: ItemState = {
    courses: [],
    isLoading: false,
    coursesList: [],
    currentLocation: {courseId: 0, sectionIndex: 0, contentIndex: 0, isTest: false}
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
        generateCourse: (state, action: PayloadAction<{ name: string, sections: SectionObjectState[] }>) => {
            let id = 0;
            if (state.coursesList.length > 0) {
                id = state.coursesList.slice(-1)[0].id + 1;
            }
            const coursesListData = [...state.coursesList, { name: action.payload.name, id }];
            state.coursesList = coursesListData;
            const coursesData = [...state.courses, { sections: action.payload.sections, id, name: action.payload.name }];
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
                    console.log(state.courses[courseIndex].sections[action.payload.sectionIndex].test[action.payload.testIndex])
                    state.courses[courseIndex].sections[action.payload.sectionIndex].test[action.payload.testIndex].isDone = true;
                }
            })
            console.log(state.courses[courseInd].sections[action.payload.sectionIndex].test[action.payload.testIndex])
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
                    console.log(state.courses[courseIndex].sections[action.payload.sectionIndex].content[action.payload.contentIndex])
                    state.courses[courseIndex].sections[action.payload.sectionIndex].content[action.payload.contentIndex].isDone = true;
                }
            })
            console.log(state.courses[courseInd].sections[action.payload.sectionIndex].content[action.payload.contentIndex])
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
            const {courseId, sectionIndex, contentIndex, isTest} = action.payload || null;
            state.currentLocation = {courseId, sectionIndex, contentIndex, isTest};
        }
    },
    extraReducers: (builder) => {
        builder.addCase(loadData.fulfilled, (state, action) => {
            state.coursesList = action.payload.coursesList;
            state.courses = action.payload.courses;
        });
    },
});

export const { generateCourse, updateData, resetData, testDone, lessonDone } = itemSlice.actions;

export const selectIsItemLoading = (state: RootState) => state.item.isLoading;
export const selectCourses = (state: RootState) => state.item.courses;
export const selectCoursesList = (state: RootState) => state.item.coursesList;

export default itemSlice.reducer;