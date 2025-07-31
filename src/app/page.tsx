// pages/index.tsx
'use client'; // This ensures it's a client component

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter for Pages Router
import { useStore } from '@/store/useStore'; // Import your Zustand store
import LoadingSpinner from '@/components/ui/loading-spinner'; // Optional: for initial loading state

export default function HomePage() {
  const { user, authChecked } = useStore(); // Get user and authChecked from your Zustand store
  const router = useRouter();

  useEffect(() => {
    // This effect will run after the AuthProvider has determined the auth state
    if (authChecked) {
      if (user) {
        // User is logged in, redirect to dashboard
        router.replace('/dashboard');
      } else {
        // User is not logged in, redirect to login
        router.replace('/login');
      }
    }
  }, [authChecked, user, router]); // Depend on authChecked and user from Zustand

  // While auth state is being determined, show a loading spinner
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // If authChecked is true but redirect hasn't happened yet (e.g., during development),
  // return null or a simple message. The useEffect will handle the redirect.
  return null;
}
