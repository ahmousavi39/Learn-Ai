import * as FileSystem from 'expo-file-system';

export const downloadAndSaveImage = async (url: string, path: string, name: string): Promise<string | null> => {
  try {
    const dirPath = `${FileSystem.documentDirectory}${path}`;

    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true }).catch(() => {});

    const filePath = `${dirPath}/${name}`;

    const downloadResult = await FileSystem.downloadAsync(url, filePath);

    if (downloadResult.status === 200) {
      return downloadResult.uri;
    } else {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
  } catch (e) {
    console.error("Error saving image locally:", e);
    return null;
  }
};
