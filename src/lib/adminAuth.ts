/**
 * adminAuth.ts - 관리자 인증 모듈
 *
 * Firestore 보안규칙(isAdmin() = request.auth != null)이 실제로 이 로그인 상태를
 * 검사하므로, 여기서 로그인이 성공해야만 관리자 화면의 조회/수정/삭제 요청이
 * Firestore에서 허용됩니다. (예전의 "PIN 4001" 입력은 화면만 가리는 장식이었고
 * 실제 데이터 접근권한과는 무관했습니다.)
 */
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export async function loginAdmin(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(getAuthErrorMessage(error?.code));
  }
}

export async function logoutAdmin(): Promise<void> {
  await signOut(auth);
}

export function onAdminAuthStateChanged(callback: (user: User | null) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}

function getAuthErrorMessage(errorCode?: string): string {
  switch (errorCode) {
    case "auth/invalid-email":
      return "올바르지 않은 이메일 형식입니다.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 일치하지 않습니다.";
    case "auth/too-many-requests":
      return "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "로그인에 실패했습니다. 입력 정보를 확인해 주세요.";
  }
}
