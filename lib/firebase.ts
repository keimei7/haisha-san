"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCA3eYSZTTDUGD86dANmqafUYjCJFUkJY8",
  authDomain: "haisha-1.firebaseapp.com",
  projectId: "haisha-1",
  storageBucket: "haisha-1.firebasestorage.app",
  messagingSenderId: "1018922285096",
  appId: "1:1018922285096:web:04263c187b6d60d1ab5d1d",
};

export const app =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);