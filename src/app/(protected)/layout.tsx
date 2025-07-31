// src/app/dashboard/layout.tsx
'use client'; // Keep this if DashboardNav is a client component

import DashboardNav from '@/components/dashboard/dashboardNav';
// No Firebase imports or redirect logic here

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <DashboardNav />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}