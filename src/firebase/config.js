import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  databaseURL: "https://barkle-9f983-default-rtdb.firebaseio.com",
  // Add any other required config values
  apiKey: "AIzaSyDxkUVjGHFl_UJmQcE5DTT_RFxnBGe-9Yk",
  authDomain: "barkle-9f983.firebaseapp.com",
  projectId: "barkle-9f983",
  storageBucket: "barkle-9f983.appspot.com",
  messagingSenderId: "1015243985857",
  appId: "1:1015243985857:web:c0d7f0c8bfb2d4c5e5d5e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get database instance
const db = getDatabase(app);

export { db };
export default app; 