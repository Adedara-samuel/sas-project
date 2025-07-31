// /app/api/admin/set-claims/route.ts
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize the Firebase Admin SDK, but add more robust error handling
try {
    if (!admin.apps.length) {
        if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
            // Log a specific error for better debugging
            console.error('Missing one or more required Firebase Admin environment variables.');
            throw new Error('Firebase Admin SDK could not be initialized due to missing environment variables.');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    }
} catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    // Re-throw the error so Next.js knows there's a problem
    throw error;
}

const adminAuth = admin.auth();

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error) {
            console.error('Error verifying ID token:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return NextResponse.json({ error: 'Unauthorized: Invalid token', details: errorMessage }, { status: 401 });
        }

        // Check if the decoded token has the admin claim
        if (!decodedToken.admin) {
            return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
        }

        const { uid, isAdmin } = await req.json();

        if (!uid || typeof isAdmin !== 'boolean') {
            return NextResponse.json({ error: 'Bad Request: Missing uid or isAdmin' }, { status: 400 });
        }

        if (isAdmin) {
            await adminAuth.setCustomUserClaims(uid, { admin: true });
        } else {
            await adminAuth.setCustomUserClaims(uid, { admin: null });
        }

        await adminAuth.revokeRefreshTokens(uid);
        console.log(`Admin status for UID: ${uid} set to ${isAdmin}. User tokens revoked.`);

        return NextResponse.json({ success: true, message: `Admin status for ${uid} set to ${isAdmin}` }, { status: 200 });

    } catch (error) {
        console.error('Error in API route:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to set admin claims', details: errorMessage }, { status: 500 });
    }
}
