import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { CloudTasksClient, protos } from '@google-cloud/tasks';

// --- Initialize Firebase Admin ---
initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// --- Cloud Tasks Setup ---
const client = new CloudTasksClient();

// Use your fixed project ID
const projectId = "sas-project-12836";
const location = "us-central1";
const queuePath = client.queuePath(projectId, location, "notification-queue");

// --- Callable Function: Send Notification ---
export const sendNotification = onCall(async (request) => {
  // This will be triggered by Cloud Tasks; auth is not required
  const { title, body } = request.data;
  
  if (!title || !body) {
    throw new HttpsError("invalid-argument", "Missing title or body in request data.");
  }

  // Fetch all FCM tokens from Firestore
  const fcmTokensSnapshot = await db.collection("artifacts/default-app-id/public/data/fcmTokens").get();
  const tokens: string[] = [];

  fcmTokensSnapshot.forEach((doc) => {
    const token = doc.data().token;
    if (token) tokens.push(token);
  });

  if (tokens.length === 0) {
    console.log("No FCM tokens found. Skipping notification.");
    return { success: false, message: "No tokens available" };
  }

  const message = {
    notification: { title, body },
    webpush: { headers: { Urgency: "high" } },
    tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log("Successfully sent message:", response.successCount, "sent.");
    return { success: true, count: response.successCount };
  } catch (error) {
    console.error("Error sending message:", error);
    throw new HttpsError("internal", "Failed to send notifications.");
  }
});

// --- Firestore Trigger: Create Cloud Tasks for Notifications ---
export const onScheduleCreate = onDocumentCreated("schedules/{scheduleId}", async (event) => {
  if (!event.data) {
    console.log("No document data found. Skipping.");
    return;
  }

  const schedule = event.data.data();
  const { title, day, startTime, userId, type } = schedule;

  if (!title || !day || !startTime) {
    console.error("Invalid schedule data. Skipping.");
    return;
  }

  const DAYS_OF_WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayIndex = new Date().getDay();
  const eventDayIndex = DAYS_OF_WEEK.indexOf(day);

  let daysDiff = eventDayIndex - todayIndex;
  if (daysDiff < 0) daysDiff += 7;

  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + daysDiff);

  const [hour, minute] = startTime.split(":").map(Number);
  eventDate.setHours(hour, minute, 0, 0);

  // Helper to create a task
  async function createTask(triggerDate: Date, msgBody: string) {
    const task: protos.google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: "POST",
        url: `https://${location}-${projectId}.cloudfunctions.net/sendNotification`,
        body: Buffer.from(JSON.stringify({ title: "Upcoming Schedule", body: msgBody, userId })).toString("base64"),
        headers: { "Content-Type": "application/json" },
        oidcToken: { serviceAccountEmail: `${projectId}@appspot.gserviceaccount.com` },
      },
      scheduleTime: { seconds: Math.floor(triggerDate.getTime() / 1000) },
    };

    try {
      const [response] = await client.createTask({ parent: queuePath, task });
      console.log(`Created task: ${response.name}`);
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  }

  // Schedule notifications
  await createTask(new Date(eventDate.getTime() - 24 * 60 * 60 * 1000), `24 hours until your ${type} - "${title}"!`);
  await createTask(new Date(eventDate.getTime() - 60 * 60 * 1000), `Your ${type} - "${title}" starts in 1 hour!`);
});
