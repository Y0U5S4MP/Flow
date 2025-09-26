import { Comic } from '../types/Comic';

const STORAGE_KEY = 'comicflow_comics';

export const saveComic = (comic: Comic): void => {
  const comics = getComics();
  const existingIndex = comics.findIndex(c => c.id === comic.id);
  
  if (existingIndex >= 0) {
    comics[existingIndex] = { ...comic, updatedAt: new Date().toISOString() };
  } else {
    comics.push(comic);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(comics));
};

export const getComics = (): Comic[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading comics:', error);
    return [];
  }
};

export const getComic = (id: string): Comic | null => {
  const comics = getComics();
  return comics.find(comic => comic.id === id) || null;
};

export const deleteComic = (id: string): void => {
  const comics = getComics();
  const filtered = comics.filter(comic => comic.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};