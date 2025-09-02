// src/app/layout.tsx
import { Inter } from 'next/font/google';
import './globals.css'; // Your global styles
import AuthProvider from '@/components/auth/auth-provider'; // Import the AuthProvider
import AuthRedirector from '@/components/auth/AuthRedirector';
import HydrationProvider from '@/components/providers/HydrationProvider';
import { NotificationManager } from '@/components/NotificationManager';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The dark mode class will be applied by AuthProvider's useEffect
  // based on the Zustand store's darkMode state.
  return (
    <html lang="en">
      <body className={`${inter.className} transition-colors duration-300`}>
        <AuthProvider>
          <AuthRedirector/>
          <HydrationProvider>
            <NotificationManager />
          {children}
        </HydrationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
