import { sendNotificationToUser } from './notificationService';
import { db } from '../config/firebase';
import { ref, push } from 'firebase/database';

// Save notification to database
export async function saveNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  data?: any
) {
  const notificationsRef = ref(db, `notifications/${userId}`);
  await push(notificationsRef, {
    title,
    body,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    data: data || {},
  });
}

// Send notification for ride acceptance
export async function notifyRideAccepted(
  passengerId: string,
  passengerName: string,
  rideId: string,
  scheduledDate?: Date
) {
  const title = '✅ Ride Confirmed!';
  const body = scheduledDate 
    ? `Your scheduled VeloCity ride has been accepted for ${scheduledDate.toLocaleString()}`
    : 'Your VeloCity driver is on the way!';
  
  await saveNotification(passengerId, title, body, 'ride_accepted', { rideId });
  await sendNotificationToUser(passengerId, title, body, { type: 'ride_accepted', rideId });
}

// Send notification for driver arrival
export async function notifyDriverArrived(
  passengerId: string,
  driverName: string,
  rideId: string
) {
  const title = '🚗 Driver Arrived';
  const body = `${driverName} has arrived at your pickup location.`;
  
  await saveNotification(passengerId, title, body, 'driver_arrived', { rideId });
  await sendNotificationToUser(passengerId, title, body, { type: 'driver_arrived', rideId });
}

// Send notification for ride completion
export async function notifyRideCompleted(
  passengerId: string,
  rideId: string
) {
  const title = '🏁 Trip Completed';
  const body = 'Your VeloCity trip has been completed. Please rate your driver!';
  
  await saveNotification(passengerId, title, body, 'ride_completed', { rideId });
  await sendNotificationToUser(passengerId, title, body, { type: 'ride_completed', rideId });
}