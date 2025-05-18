import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAllKeys, getItem, putItem, removeItem } from '../../app/services/AsyncStorage';
import type { RootState } from '../../app/store'


interface settingsState {
    language: {key: string}
}

const initialState: settingsState = {
    language: {key: "en"}
}

export const loadLanguage = createAsyncThunk('language/loadLanguage', async () => {
    if ((await getAllKeys()).includes("language")) {
        const language = await getItem('language');
        return language;
    } else {
        await putItem("language", {key: "en"});
        return {key: "en"};
    }
});

export const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setLanguage: (state, action: PayloadAction<any>) => {
            state.language = action.payload;
            const pushData = async () => {
                await putItem('language', action.payload);
            }

            pushData();
        },
    },
    extraReducers: (builder) => {
        builder.addCase(loadLanguage.fulfilled, (state, action) => {
                state.language = action.payload;
        });
    },
});

export const { setLanguage } = settingsSlice.actions;

export const selectLanguage = (state: RootState) => state.settings.language;

export default settingsSlice.reducer;