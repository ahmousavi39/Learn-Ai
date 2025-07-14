import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

const LightTheme = {
    background: '#f3f3f3ff',
    text: '#111827',
    border: '#f3f3f3ff',
    primary: '#7c3aed',
    secondary: '#3b82f6',
    true: '#16a34a',
    error: '#dc2626',
    disBackground: 'rgba(0, 0, 0, 0.5)',
    card: '#fc4848e0',
    cardText: '#f9fafb',
    inputText: 'rgba(0, 0, 0, 0.5)',
    inputBorder: '#cbd5e1',
    inputBackground: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.08)',
    progress: '#16a34a',
    progressWrapper: '#e5e7eb',
    headerBackground: '#ffffff',
    headerTitle: '#111827',
    sectionBackground: '#ffffffff',
    sectionSelectedBackground: '#f3f3f3ff',
    optionText: '#ffffff'
};

const DarkTheme = {
    background: '#0f172a',
    text: '#f8fafc',
    border: '#0f172a',
    true: '#16a34a',
    primary: '#a78bfa',
    secondary: '#ffffffff',
    error: '#ff4a4aff',
    disBackground: 'rgba(0, 0, 0, 0.5)',
    card: '#1e293b',
    cardText: '#f8fafc',
    inputBorder: '#475569',
    inputBackground: '#1e293b',
    shadow: 'rgba(0, 0, 0, 0.4)',
    progress: '#22c55e',
    progressWrapper: '#1f2937',
    inputText: 'rgba(255, 255, 255, 0.5)',
    headerBackground: '#1e293b',
    headerTitle: '#f8fafc',
    sectionBackground: '#1e293b',
    sectionSelectedBackground: '#0f172a',
    optionText: '#0f172a'
};


const ThemeContext = createContext({
    theme: LightTheme,
    mode: 'light',
    setMode: (mode: 'light' | 'dark' | 'system') => { },
});

export function ThemeProvider({ children }) {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState<'light' | 'dark' | 'system'>('system');

    const theme = useMemo(() => {
        const resolved = mode === 'system' ? systemScheme : mode;
        return resolved === 'dark' ? DarkTheme : LightTheme;
    }, [mode, systemScheme]);

    return (
        <ThemeContext.Provider value={{ theme, mode, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}