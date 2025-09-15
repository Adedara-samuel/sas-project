import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// Import the Cloud Tasks library and its types
import { CloudTasksClient, protos } from '@google-cloud/tasks';

// Initialize the Firebase Admin SDK.
initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// Initialize the Cloud Tasks client
const client = new CloudTasksClient();

// Your project ID and location for the task queue
const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
const location = 'us-central1'; // Or your function's location

// --- Input Validation ---
// We must ensure the projectId exists, as it is required for Cloud Tasks.
if (!projectId) {
  console.error('Project ID is undefined. Cannot create Cloud Tasks.');
  throw new Error('Project ID is undefined.');
}

// A helper to get the full path for the task queue
const queuePath = client.queuePath(projectId, location, 'notification-queue');

// --- Scheduled Notification Function (Callable by Cloud Tasks) ---
// This is the function that will actually send the notification.
// It's not triggered directly by Firestore; it's triggered by a Cloud Task.
export const sendNotification = onCall(async (request) => {
  if (!request.auth) {
    // This check is mainly for testing; Cloud Tasks will not have auth.
    throw new HttpsError('unauthenticated', 'The function must be called with a user.');
  }

  const { title, body, userId } = request.data;
  
  // Fetch all FCM tokens from the public collection
  // The schedule app uses 'default-app-id' for testing, so we'll use that.
  const fcmTokensSnapshot = await db.collection('artifacts/default-app-id/public/data/fcmTokens').get();

  const tokens: string[] = [];
  fcmTokensSnapshot.forEach(doc => {
    const token = doc.data().token;
    if (token) {
      tokens.push(token);
    }
  });

  if (tokens.length === 0) {
    console.log(`No FCM tokens found. No messages sent.`);
    return;
  }

  // Build the notification message
  const message = {
    notification: {
      title: title,
      body: body,
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
    },
    tokens: tokens, // Use `tokens` for sending to multiple devices
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
});


// --- Firestore Trigger Function ---
// This function is triggered automatically whenever a new schedule event is created.
export const onScheduleCreate = onDocumentCreated('schedules/{scheduleId}', async (event) => {
  // Add this check to prevent errors if the document data is missing
  if (!event.data) {
    console.log('Document data is undefined. Skipping function execution.');
    return;
  }
  
  const schedule = event.data.data();

  const title = schedule.title;
  const day = schedule.day;
  const startTime = schedule.startTime;
  const userId = schedule.userId;
  const type = schedule.type;

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayIndex = new Date().getDay(); // 0-6 (Sunday to Saturday)
  const eventDayIndex = DAYS_OF_WEEK.indexOf(day);
  
  // Calculate the difference in days to get the next occurrence
  let daysDiff = eventDayIndex - todayIndex;
  if (daysDiff < 0) {
    daysDiff += 7;
  }

  // Get the current date and set it to the next event day
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + daysDiff);
  
  // Parse start time (e.g., "13:00")
  const [hour, minute] = startTime.split(':').map(Number);
  eventDate.setHours(hour, minute, 0, 0);

  // --- 24-Hour Notification ---
  const twentyFourHourBefore = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
  const twentyFourHourMessage = `24 hours until your ${type} - "${title}"!`;

  // Create a Cloud Task for the 24-hour notification
  const twentyFourHourTask: protos.google.cloud.tasks.v2.ITask = {
    httpRequest: {
      httpMethod: 'POST',
      url: `https://${location}-${projectId}.cloudfunctions.net/sendNotification`,
      body: Buffer.from(JSON.stringify({ 
        title: 'Upcoming Schedule', 
        body: twentyFourHourMessage, 
        userId: userId 
      })).toString('base64'),
      headers: {
        'Content-Type': 'application/json',
      },
      oidcToken: {
        serviceAccountEmail: `${projectId}@appspot.gserviceaccount.com`,
      },
    },
    scheduleTime: {
      seconds: twentyFourHourBefore.getTime() / 1000,
    },
  };

  try {
    const [response] = await client.createTask({
      parent: queuePath,
      task: twentyFourHourTask,
    });
    console.log(`Created 24-hour notification task: ${response.name}`);
  } catch (error) {
    console.error('Failed to create 24-hour task:', error);
  }
  
  // --- 1-Hour Notification ---
  const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
  const oneHourMessage = `Your ${type} - "${title}" starts in 1 hour!`;

  // Create a Cloud Task for the 1-hour notification
  const oneHourTask: protos.google.cloud.tasks.v2.ITask = {
    httpRequest: {
      httpMethod: 'POST',
      url: `https://${location}-${projectId}.cloudfunctions.net/sendNotification`,
      body: Buffer.from(JSON.stringify({ 
        title: 'Upcoming Schedule', 
        body: oneHourMessage, 
        userId: userId 
      })).toString('base64'),
      headers: {
        'Content-Type': 'application/json',
      },
      oidcToken: {
        serviceAccountEmail: `${projectId}@appspot.gserviceaccount.com`,
      },
    },
    scheduleTime: {
      seconds: oneHourBefore.getTime() / 1000,
    },
  };

  try {
    const [response] = await client.createTask({
      parent: queuePath,
      task: oneHourTask,
    });
    console.log(`Created 1-hour notification task: ${response.name}`);
  } catch (error) {
    console.error('Failed to create 1-hour task:', error);
  }
});
