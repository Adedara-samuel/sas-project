// utils/admin.ts (or wherever you put client-side admin functions)
import { getAuth } from 'firebase/auth'; // Correct client-side import

export const setAdminClaim = async (uid: string, isAdmin: boolean): Promise<boolean> => {
    try {
        const currentUser = getAuth().currentUser;
        if (!currentUser) {
            console.error('No authenticated user found.');
            return false;
        }

        // Ensure the current user's ID token is fresh
        const idToken = await currentUser.getIdToken(true); // true forces a token refresh

        const response = await fetch('/api/admin/set-claims', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`, // Send the current admin's token
            },
            body: JSON.stringify({ uid, isAdmin }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to set claims');
        }

        // After successfully setting claims, force the current user's token to refresh
        // so their local claims object is updated.
        await currentUser.getIdToken(true); // This refreshes the *calling* user's claims
        console.log(`Successfully updated admin status for UID: ${uid} to ${isAdmin}`);
        return true;
    } catch (error) {
        console.error('Error setting admin claim:', error);
        return false;
    }
};