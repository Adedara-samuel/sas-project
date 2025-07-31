// src/components/Layout.tsx (or wherever this Layout component is defined)
'use client'; // Keep this if it's a client component

import { useStore } from '@/store/useStore';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/router'; // Correct import for Pages Router
import Head from 'next/head'; // Correct import for Pages Router
import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
    // We get the user and authChecked from Zustand.
    // AuthProvider is responsible for populating these.
    const { user, authChecked } = useStore();
    const router = useRouter();

    // REMOVE THE FOLLOWING useEffect. It is redundant and causes the type error.
    // The AuthProvider component already handles onAuthStateChanged and populates the user state.
    /*
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
            // This line causes the error because firebaseUser is not your custom User type
            setUser(firebaseUser); // <-- REMOVE THIS LINE
            if (!firebaseUser && router.pathname !== '/login') {
                router.push('/login');
            }
        });
        return unsubscribe;
    }, [setUser, router]);
    */

    const handleLogout = async () => {
        try {
            await auth.signOut();
            // After signOut, AuthProvider's onAuthStateChanged will set user to null,
            // and AuthRedirector will handle the redirect to /login.
            // Explicit router.push('/login') here is technically redundant but harmless.
            router.push('/login');
        } catch (error: unknown) { // Add unknown type for error
            console.error('Error logging out:', error);
            if (error instanceof Error) {
                // In a real app, use a custom modal instead of alert()
                alert(`Error logging out: ${error.message}`);
            } else {
                alert('An unknown error occurred during logout.');
            }
        }
    };

    // Conditional rendering for the navigation bar
    // Only show navigation if authChecked is true AND user is logged in
    // AND not on the login page.
    const showNavbar = authChecked && user && router.pathname !== '/login';

    return (
        <>
            <Head>
                <title>Student Academic System</title>
                <meta name="description" content="Manage your academic life" />
            </Head>

            {showNavbar && (
                <nav className="bg-blue-600 text-white p-4">
                    <div className="container mx-auto flex justify-between items-center">
                        <Link href="/dashboard" className="text-xl font-bold">
                            Academic Manager
                        </Link>
                        <div className="flex items-center space-x-4">
                            {/* Display user's name or email. user is now guaranteed to be your custom User type */}
                            <span>{user?.name || user?.email}</span>
                            <button
                                onClick={handleLogout}
                                className="bg-white text-blue-600 px-3 py-1 rounded text-sm"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </nav>
            )}

            <main className="container mx-auto p-4">{children}</main>
        </>
    );
}
