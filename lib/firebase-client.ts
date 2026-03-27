"use client";

import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

export const auth = getAuth(app);
