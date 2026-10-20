import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4SMiJ1GzPJeX9qhsvwafbE9x674Ngnug",
  authDomain: "nexride-6c958.firebaseapp.com",
  databaseURL: "https://nexride-6c958-default-rtdb.firebaseio.com",
  projectId: "nexride-6c958",
  storageBucket: "nexride-6c958.firebasestorage.app",
  messagingSenderId: "179344335227",
  appId: "1:179344335227:web:074a9ae3b1edd16353ddde"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

export { auth, db, storage };