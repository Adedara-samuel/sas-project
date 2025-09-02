/* eslint-disable @typescript-eslint/no-unused-vars */
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();

exports.dailyScheduleNotification = functions.pubsub
    .schedule('0 6 * * *')
    .onRun(async (context) => {
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = daysOfWeek[new Date().getDay()];

        console.log(`Checking for schedules on ${today}...`);

        try {
            const schedulesRef = admin.firestore().collection('schedule');
            const snapshot = await schedulesRef.where('day', '==', today).get();

            if (snapshot.empty) {
                console.log('No schedules found for today.');
                return null;
            }

            const sendNotificationPromises: Promise<void>[] = [];
            snapshot.forEach(doc => {
                const schedule = doc.data();

                const now = new Date();
                const [hour, minute] = schedule.startTime.split(':');
                const scheduleTime = new Date();
                scheduleTime.setHours(Number(hour), Number(minute), 0, 0);

                if (scheduleTime > now) {
                    sendNotificationPromises.push(
                        sendNotification(schedule)
                    );
                }
            });

            await Promise.all(sendNotificationPromises);
            console.log('Finished sending notifications.');
            return null;

        } catch (error) {
            console.error('Error in daily schedule notification:', error);
            return null;
        }
    });

async function sendNotification(schedule: FirebaseFirestore.DocumentData) {
    const { title, location, userId, startTime } = schedule;

    try {
        const userRef = admin.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists || !userDoc.data()?.fcmToken) {
            console.log(`No FCM token found for user: ${userId}`);
            return;
        }

        const fcmToken: string = userDoc.data()!.fcmToken;

        const message = {
            notification: {
                title: `Upcoming Class: ${title}`,
                body: `Your class starts at ${startTime}. Location: ${location || 'N/A'}`,
            },
            token: fcmToken,
        };

        const response = await admin.messaging().send(message);
        console.log(`Successfully sent message to ${userId}:`, response);

    } catch (error) {
        console.error(`Error sending message for schedule: ${schedule.id}`, error);
    }
}