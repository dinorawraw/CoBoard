import { create } from 'zustand';
import { BoardState, MediaElement, User } from '../types/board';

interface BoardStore extends BoardState {
  addElement: (element: MediaElement) => void;
  updateElement: (id: string, updates: Partial<MediaElement>) => void;
  removeElement: (id: string) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  updateUsers: (users: User[]) => void;
}

export const useBoardStore = create<BoardStore>((set) => ({
  id: '',
  elements: [],
  users: [],
  zoom: 100,
  pan: { x: 0, y: 0 },

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
    })),

  setZoom: (zoom) =>
    set(() => ({
      zoom: Math.min(Math.max(zoom, 25), 400),
    })),

  setPan: (x, y) =>
    set(() => ({
      pan: { x, y },
    })),

  updateUsers: (users) =>
    set(() => ({
      users,
    })),
}));