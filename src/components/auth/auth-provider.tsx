/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseAuthUser, signOut } from 'firebase/auth'; // Import signOut
import { auth, db } from '@/lib/firebase';
import { useStore, User as ZustandUser } from '@/store/useStore';
import { usePathname, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { User as AppUserType } from '@/types/user';

// Define 24 hours in milliseconds
const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, setUser, authChecked, setAuthChecked, darkMode, language, toggleDarkMode, setLanguage } = useStore();

    useEffect(() => {
        console.log('AuthProvider: Setting up onAuthStateChanged listener.');

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseAuthUser | null) => {
            console.log('AuthProvider: onAuthStateChanged fired. FirebaseUser:', firebaseUser);

            let currentUserState: AppUserType | null = null;

            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    let firestoreData: Partial<AppUserType> = {};
                    let userRole: 'admin' | 'student' = 'student';
                    let lastLoginTimestamp: Timestamp | null = null;

                    if (userDocSnap.exists()) {
                        firestoreData = userDocSnap.data() as Partial<AppUserType>;
                        userRole = firestoreData.role || 'student';
                        lastLoginTimestamp = firestoreData.lastLoginAt instanceof Timestamp ? firestoreData.lastLoginAt : null;
                    } else {
                        console.log("AuthProvider: Creating new user profile in Firestore for:", firebaseUser.uid);
                        if (process.env.NEXT_PUBLIC_ADMIN_EMAIL && firebaseUser.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
                            userRole = 'admin';
                        }
                        firestoreData = {
                            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || null,
                            email: firebaseUser.email,
                            role: userRole,
                            photoURL: firebaseUser.photoURL,
                            // lastLoginAt will be set on actual login via LoginForm
                        };
                        await setDoc(userDocRef, firestoreData, { merge: true });
                    }

                    // --- 24-Hour Session Check ---
                    if (lastLoginTimestamp) {
                        const lastLoginTime = lastLoginTimestamp.toMillis();
                        const currentTime = Date.now();
                        const timeElapsed = currentTime - lastLoginTime;

                        console.log(`AuthProvider: Time since last login for ${firebaseUser.uid}: ${timeElapsed / 1000 / 60} minutes.`);
                        if (timeElapsed > TWENTY_FOUR_HOURS_IN_MS) {
                            console.log('AuthProvider: 24 hours elapsed since last login. Forcing logout.');
                            await signOut(auth); // Force logout
                            currentUserState = null; // Set state to null immediately
                            // The onAuthStateChanged listener will fire again with firebaseUser = null
                            // and handle the redirection to login.
                        } else {
                            // If session is still valid, construct user state
                            currentUserState = {
                                id: firebaseUser.uid,
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                displayName: firebaseUser.displayName,
                                photoURL: firestoreData.photoURL || firebaseUser.photoURL || null,
                                metadata: {
                                    creationTime: firebaseUser.metadata.creationTime,
                                    lastSignInTime: firebaseUser.metadata.lastSignInTime,
                                },
                                name: firestoreData.name || firebaseUser.displayName || null,
                                role: userRole,
                            };
                            console.log("AuthProvider: User profile set in Zustand (session valid):", currentUserState);
                        }
                    } else {
                        // If lastLoginAt is not set (e.g., very first login after this feature is deployed),
                        // treat as valid for now, but it will be set on next login.
                        console.warn("AuthProvider: lastLoginAt not found for user. Treating session as valid for now.");
                        currentUserState = {
                            id: firebaseUser.uid,
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firestoreData.photoURL || firebaseUser.photoURL || null,
                            metadata: {
                                creationTime: firebaseUser.metadata.creationTime,
                                lastSignInTime: firebaseUser.metadata.lastSignInTime,
                            },
                            name: firestoreData.name || firebaseUser.displayName || null,
                            role: userRole,
                        };
                    }

                    document.documentElement.classList.toggle('dark', darkMode);

                } catch (error: unknown) {
                    console.error('AuthProvider: Error processing Firebase user data or session check:', error);
                    currentUserState = null;
                }
            } else {
                console.log("AuthProvider: User signed out.");
                currentUserState = null;
            }

            setUser(currentUserState);
            setAuthChecked(true);
            console.log('AuthProvider: authChecked set to true in Zustand.');

            // --- Redirection Logic (Centralized) ---
            const protectedRoutes = ['/dashboard', '/settings', '/profile', '/courses', '/notes', '/ai'];
            const publicAuthRoutes = ['/login', '/register', '/forgot-password'];

            const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
            const isPublicAuthRoute = publicAuthRoutes.some(route => pathname.startsWith(route));
            const isHomePage = pathname === '/';

            console.log('AuthProvider Redirection Check:');
            console.log('  - Current Pathname:', pathname);
            console.log('  - isAuthenticated (currentUserState exists):', !!currentUserState);
            console.log('  - isProtectedRoute:', isProtectedRoute);
            console.log('  - isPublicAuthRoute:', isPublicAuthRoute);
            console.log('  - isHomePage:', isHomePage);

            if (currentUserState) {
                // User IS logged in
                if (isPublicAuthRoute || isHomePage) {
                    console.log('AuthProvider: User logged in and on a public/home route. Redirecting to dashboard.');
                    router.replace('/dashboard');
                } else {
                    console.log('AuthProvider: User logged in and already on a protected route. No redirect needed.');
                }
            } else {
                // User is NOT logged in
                if (isProtectedRoute) {
                    router.replace('/login');
                } else {
                    console.log('AuthProvider: User NOT logged in and on a public auth/other page. No redirect needed.');
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [setUser, setAuthChecked, router, pathname, darkMode, language]);

    if (!authChecked) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    console.log('AuthProvider: Rendering children (authChecked is true). Current user:', user);
    return <>{children}</>;
}
