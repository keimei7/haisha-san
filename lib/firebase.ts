import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCA3eYSZTTDUGD86dANmqafUYjCJFUkJY8",
  authDomain: "haisha-1.firebaseapp.com",
  projectId: "haisha-1",
  storageBucket: "haisha-1.firebasestorage.app",
  messagingSenderId: "1018922285096",
  appId: "1:1018922285096:web:04263c187b6d60d1ab5d1d",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);