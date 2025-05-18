import { configureStore } from '@reduxjs/toolkit';
import itemSlice from '../features/item/itemSlice';
import settingsSlice from '../features/settings/settingsSlice';

export const store = configureStore({
  reducer: {
    item:itemSlice,
    settings: settingsSlice
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch