// src/types/user.ts
import { Timestamp } from 'firebase/firestore';
// Define the User interface here, which represents the user data stored in Zustand and Firestore
export interface User {
    id: string; // Firebase UID
    uid: string; // Firebase UID (often redundant with 'id' but kept for clarity)
    email: string | null;
    name: string | null; // Editable name, potentially from Firestore profile
    displayName: string | null; // From Firebase Auth (e.g., Google sign-in name)
    role: 'admin' | 'student'; // Role must be 'admin' or 'student'
    school: string | null;
    department: string | null
    photoURL: string | null; // Photo URL
    metadata: {
        creationTime: string | undefined;
        lastSignInTime: string | undefined;
    };
    lastLoginAt?: Timestamp;
}
