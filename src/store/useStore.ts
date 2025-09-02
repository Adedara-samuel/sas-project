// src/store/useStore.ts
import { Timestamp } from 'firebase/firestore'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../types/user'

// Keep all other interfaces as they were.
export interface Course {
    id: string
    title: string
    code: string
    units: number
    lecturer: string
    description?: string
    userId?: string
    createdAt: Date
    materials?: {
        name: string;
        url: string;
        type?: string;
        size?: number;
    }[];
}

export interface Book {
    id: string
    title: string
    author: string
    isbn?: string
    coverUrl: string
    description?: string
    publishedYear?: number
    category?: string
    availableCopies: number
    createdAt: Date
    addedBy?: string
}

export interface Note {
    id: string
    courseId: string
    title: string
    content: string
    createdAt: Date
    updatedAt: Date
    userId: string
}

export interface Schedule {
    id: string
    courseId: string
    userId: string
    title: string;
    type: 'Class' | 'Assignment' | 'Exam' | 'Other';
    day: string
    startTime: string
    endTime: string
    location: string
    recurring: boolean
    createdAt: Date
    updatedAt?: Date
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'file';
    content: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    fileSize?: number;
    timestamp: Timestamp;
    // New properties for file upload capability
    fileData?: string;
    fileMimeType?: string;
}

export interface ChatSession {
    id: string;
    userId: string;
    courseId?: string | null;
    title: string;
    messages: ChatMessage[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

interface StoreState {
    // The user state now correctly uses the imported User type
    user: User | null
    courses: Course[]
    books: Book[]
    notes: Note[]
    schedules: Schedule[]
    currentCourse: Course | null
    authChecked: boolean
    darkMode: boolean
    language: 'en' | 'fr' | 'es'

    // Actions
    setUser: (user: User | null) => void
    setCourses: (courses: Course[]) => void
    setBooks: (books: Book[]) => void
    setNotes: (notes: Note[]) => void
    setSchedules: (schedules: Schedule[]) => void
    setCurrentCourse: (course: Course | null) => void
    setAuthChecked: (checked: boolean) => void
    toggleDarkMode: () => void
    setLanguage: (language: 'en' | 'fr' | 'es') => void
}

export interface Resource {
    id: string;
    title: string;
    description?: string;
    type: 'book' | 'material';
    source: string; // e.g., 'Book' or course title
    url: string; // for both books and materials
    coverUrl?: string; // only for books
    fileType?: string; // only for materials
    addedBy: string; // a string with the user's name or ID
    createdAt: Date;
}

export const useStore = create<StoreState>()(
    persist(
        (set) => ({
            user: null,
            courses: [],
            books: [],
            notes: [],
            schedules: [],
            currentCourse: null,
            authChecked: false,
            darkMode: false,
            language: 'en',

            setUser: (user) => set({ user }),
            setCourses: (courses) => set({ courses }),
            setBooks: (books) => set({ books }),
            setNotes: (notes) => set({ notes }),
            setSchedules: (schedules) => set({ schedules }),
            setCurrentCourse: (course) => set({ currentCourse: course }),
            setAuthChecked: (checked) => set({ authChecked: checked }),
            toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
            setLanguage: (language) => set({ language })
        }),
        {
            name: 'academic-store',
            partialize: (state) => ({
                darkMode: state.darkMode,
                language: state.language
            })
        }
    )
)