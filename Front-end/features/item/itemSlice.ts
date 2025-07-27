import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAllKeys, getItem, mergeItem, putItem, removeItem } from '../../app/services/AsyncStorage';
import type { RootState } from '../../app/store';

interface SectionObjectState {
  title: string;
  content: {
    title: string;
    id: number;
    bulletpoints: string[];
    imageUrl: string;
    imageUri?: any | null;
    isDone: boolean;
  }[];
  test: {
    id: number;
    isDone: boolean;
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
  currentLocation: {
    courseId: number | null;
    sectionIndex: number | null;
    contentIndex: number | null;
    isTest: boolean;
  };
}

const initialState: ItemState = {
  courses: [],
  isLoading: false,
  coursesList: [],
  currentLocation: {
    courseId: null,
    sectionIndex: null,
    contentIndex: null,
    isTest: false,
  },
};

export const loadData = createAsyncThunk('data/loadData', async () => {
  const keys = await getAllKeys();
  if (keys.includes('courses')) {
    const coursesList = await getItem('coursesList');
    const courses = await getItem('courses');
    return { coursesList, courses };
  }
  return { coursesList: [], courses: [] };
});

export const itemSlice = createSlice({
  name: 'item',
  initialState,
  reducers: {
    generateCourse: (
      state,
      action: PayloadAction<{
        name: string;
        sections: SectionObjectState[];
        language: string;
        level: string;
      }>
    ) => {
      state.isLoading = true;

      let id = 0;
      if (state.coursesList.length > 0) {
        id = state.coursesList[state.coursesList.length - 1].id + 1;
      }

      const coursesListData = [...state.coursesList, { name: action.payload.name, id }];
      const coursesData = [
        ...state.courses,
        {
          sections: action.payload.sections,
          id,
          name: action.payload.name,
          language: action.payload.language,
          level: action.payload.level,
        },
      ];

      state.coursesList = coursesListData;
      state.courses = coursesData;

      (async () => {
        await putItem('coursesList', coursesListData);
        await putItem('courses', coursesData);
        console.log(`📚 NEW COURSE STORED LOCALLY:`);
        console.log(`   - Course name: ${action.payload.name}`);
        console.log(`   - Language: ${action.payload.language}`);
        console.log(`   - Level: ${action.payload.level}`);
        console.log(`   - Sections: ${action.payload.sections.length}`);
        console.log(`   - Total courses in storage: ${coursesData.length}`);
        console.log(`📋 All courses in storage:`, coursesListData.map(c => `"${c.name}" (ID: ${c.id})`));
      })();

      state.isLoading = false;
    },

    // addSectionImageUri: (
    //   state,
    //   action: PayloadAction<{ courseId: number; sectionIndex: number; imageUris: any[] }>
    // ) => {
    //   const { courseId, sectionIndex, imageUris } = action.payload;

    //   state.courses.forEach((course, courseIndex) => {
    //     if (course.id === courseId) {
    //       imageUris.forEach((uri, contentIndex) => {
    //         state.courses[courseIndex].sections[sectionIndex].content[contentIndex].imageUri = uri;
    //       });

    //       (async () => {
    //         await mergeItem('courses', state.courses);
    //       })();
    //     }
    //   });
    // },

    updateData: (state) => {
      (async () => {
        await putItem('courses', state.courses);
        console.log(`🔄 COURSE PROGRESS UPDATED:`);
        console.log(`   - Total courses: ${state.courses.length}`);
        
        // Show progress summary for each course
        state.courses.forEach(course => {
          let totalItems = 0;
          let completedItems = 0;
          
          course.sections.forEach(section => {
            totalItems += section.content?.length || 0;
            totalItems += section.test?.length || 0;
            completedItems += section.content?.filter(item => item.isDone).length || 0;
            completedItems += section.test?.filter(test => test.isDone).length || 0;
          });
          
          console.log(`   - "${course.name}": ${completedItems}/${totalItems} completed`);
        });
      })();
    },

    testDone: (
      state,
      action: PayloadAction<{ courseId: number; sectionIndex: number; testIndex: number }>
    ) => {
      const { courseId, sectionIndex, testIndex } = action.payload;

      state.courses.forEach((course, courseIndex) => {
        if (course.id === courseId) {
          state.courses[courseIndex].sections[sectionIndex].test[testIndex].isDone = true;
        }
      });

      (async () => {
        await putItem('courses', state.courses);
        console.log(`🧪 TEST COMPLETED AND STORED:`);
        console.log(`   - Course ID: ${courseId}`);
        console.log(`   - Section: ${sectionIndex}`);
        console.log(`   - Test: ${testIndex}`);
      })();
    },

    lessonDone: (
      state,
      action: PayloadAction<{ courseId: number; sectionIndex: number; contentIndex: number }>
    ) => {
      const { courseId, sectionIndex, contentIndex } = action.payload;

      state.courses.forEach((course, courseIndex) => {
        if (course.id === courseId) {
          state.courses[courseIndex].sections[sectionIndex].content[contentIndex].isDone = true;
        }
      });

      (async () => {
        await putItem('courses', state.courses);
        console.log(`✅ LESSON COMPLETED AND STORED:`);
        console.log(`   - Course ID: ${courseId}`);
        console.log(`   - Section: ${sectionIndex}`);
        console.log(`   - Content: ${contentIndex}`);
      })();
    },

    resetData: (state) => {
      state.coursesList = [];
      state.courses = [];

      (async () => {
        await removeItem('coursesList');
        await removeItem('courses');
        console.log(`🗑️ ALL COURSE DATA CLEARED FROM STORAGE`);
      })();
    },

    openLocation: (
      state,
      action: PayloadAction<{
        courseId: number;
        sectionIndex: number;
        contentIndex: number;
        isTest: boolean;
      }>
    ) => {
      const { courseId, sectionIndex, contentIndex, isTest } = action.payload;
      state.currentLocation = { courseId, sectionIndex, contentIndex, isTest };
    },

    regenerateLesson: (
      state,
      action: PayloadAction<{
        courseId: number;
        sectionIndex: number;
        contentIndex: number;
        newBulletpoints: string[];
      }>
    ) => {
      const { courseId, sectionIndex, contentIndex, newBulletpoints } = action.payload;

      state.courses.forEach((course, courseIndex) => {
        if (course.id === courseId) {
          state.courses[courseIndex].sections[sectionIndex].content[contentIndex].bulletpoints =
            newBulletpoints;
        }
      });

      (async () => {
        await putItem('courses', state.courses);
        console.log(`🔄 LESSON REGENERATED AND STORED:`);
        console.log(`   - Course ID: ${courseId}`);
        console.log(`   - Section: ${sectionIndex}`);
        console.log(`   - Content: ${contentIndex}`);
        console.log(`   - New bulletpoints: ${newBulletpoints.length} items`);
      })();
    },
  },

  extraReducers: (builder) => {
    builder.addCase(loadData.fulfilled, (state, action) => {
      state.coursesList = action.payload.coursesList;
      state.courses = action.payload.courses;
    });
  },
});

export const {
  generateCourse,
  updateData,
  resetData,
  testDone,
  lessonDone,
  openLocation,
  regenerateLesson,
//   addSectionImageUri,
} = itemSlice.actions;

export const selectIsItemLoading = (state: RootState) => state.item.isLoading;
export const selectCourses = (state: RootState) => state.item.courses;
export const selectCoursesList = (state: RootState) => state.item.coursesList;
export const selectCurrentLocation = (state: RootState) => state.item.currentLocation;

export default itemSlice.reducer;
