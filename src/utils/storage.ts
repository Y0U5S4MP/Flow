import { Comic } from '../types/Comic';

// Clave para almacenar cómics en localStorage
const STORAGE_KEY = 'comicflow_comics';

// Guarda o actualiza un cómic en el almacenamiento local
export const saveComic = (comic: Comic): void => {
  const comics = getComics();
  const existingIndex = comics.findIndex(c => c.id === comic.id);

  if (existingIndex >= 0) {
    // Actualizar cómic existente
    comics[existingIndex] = { ...comic, updatedAt: new Date().toISOString() };
  } else {
    // Agregar nuevo cómic
    comics.push(comic);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(comics));
};

// Obtiene todos los cómics del almacenamiento local
export const getComics = (): Comic[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error cargando cómics:', error);
    return [];
  }
};

// Obtiene un cómic específico por su ID
export const getComic = (id: string): Comic | null => {
  const comics = getComics();
  return comics.find(comic => comic.id === id) || null;
};

// Elimina un cómic por su ID
export const deleteComic = (id: string): void => {
  const comics = getComics();
  const filtered = comics.filter(comic => comic.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};