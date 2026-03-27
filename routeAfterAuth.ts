import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getNextPathAfterAuth(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));

  if (snap.exists()) {
    return "/mypage";
  }

  return "/setup/create-company";
}