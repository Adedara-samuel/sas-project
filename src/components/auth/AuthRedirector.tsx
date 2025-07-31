'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function AuthRedirector() {
    const { user } = useStore(); // Get user state from Zustand
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);

    // This useEffect specifically waits for Firebase's *initial* auth state check to complete
    // by observing the `user` object from Zustand, which is populated by the `AuthContext`
    useEffect(() => {
        // Check if user is explicitly null or an object.
        // If it's still undefined (initial Zustand state before AuthContext sets it),
        // then the check isn't complete.
        if (user !== undefined) { // Assuming your initial user state is `undefined` or `null`
            setIsAuthCheckComplete(true);
        }
    }, [user]);

    // This useEffect handles the actual redirects
    useEffect(() => {
        if (!isAuthCheckComplete) {
            // Wait until the initial auth check is done
            return;
        }

        // Define your public and protected routes
        const protectedRoutes = ['/dashboard', '/settings', '/profile', '/courses']; // Add all your protected routes
        const publicAuthRoutes = ['/login', '/register', '/forgot-password']; // Add other public auth routes

        const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
        const isPublicAuthRoute = publicAuthRoutes.some(route => pathname.startsWith(route));

        if (user) {
            // User IS logged in
            if (isPublicAuthRoute) {
                router.replace('/dashboard');
            }
        } else {
            // User is NOT logged in
            if (isProtectedRoute) {
                router.replace('/login');
            }
        }
    }, [isAuthCheckComplete, user, pathname, router]);

    // You can return null or a loading spinner from this component
    // depending on whether you want a global loading state while redirects happen.
    // If your main AuthProvider already handles the initial 'loading' based on `authResolved`,
    // this component primarily focuses on the *post-auth-check* redirects.
    // For simplicity, we can let the main layout's `AuthProvider` handle the very initial loading.
    return null; // This component doesn't render anything itself, it just handles redirects
}