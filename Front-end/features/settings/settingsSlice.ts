import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAllKeys, getItem, putItem } from '../../app/services/AsyncStorage';
import type { RootState } from '../../app/store';

interface SettingsState {
    language: { key: string };
    mode: 'system' | 'light' | 'dark';
}

const initialState: SettingsState = {
    language: { key: 'en' },
    mode: 'system',
};

export const loadSettings = createAsyncThunk('language/loadSettings', async () => {
    const keys = await getAllKeys();
    let mode = 'system';
    let language = { key: 'en' };
    if (keys.includes('mode')) {
        mode = await getItem('mode');
    } else {
        await putItem('mode', mode);
    }
    if (keys.includes('language')) {
        language = await getItem('language');
    } else {
        await putItem('language', language);
    }
    return { mode, language }
});

export const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setLanguage: (state, action: PayloadAction<{ key: string }>) => {
            state.language = action.payload;
            (async () => {
                await putItem('language', action.payload);
            })();
        },
        setModeSetting: (state, action: PayloadAction<'system' | 'light' | 'dark'>) => {
            state.mode = action.payload;
            (async () => {
                await putItem('mode', action.payload);
            })();
        }
    },
    extraReducers: (builder) => {
        builder.addCase(loadSettings.fulfilled, (state, action) => {
            state.language = action.payload.language;
            state.mode = action.payload.mode;
        });
    },
});

export const { setLanguage, setModeSetting } = settingsSlice.actions;
export const selectLanguage = (state: RootState) => state.settings.language;
export const selectModeSetting = (state: RootState) => state.settings.mode;
export default settingsSlice.reducer;