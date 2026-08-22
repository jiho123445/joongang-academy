/**
 * studentAuth.ts - 수강생(자료실 이용자) 인증 모듈
 *
 * 관리자와 동일한 Firebase Authentication을 공유하되, 계정이 관리자인지
 * 수강생인지는 Firestore의 별도 컬렉션(admins / students)으로 구분합니다.
 * 회원가입 직후에는 students/{uid} 문서가 status: '승인대기' 상태로 생성되고,
 * 원장님이 관리자 화면에서 승인해야 자료실 열람 권한(status: '승인됨')이 생깁니다.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { StudentProfile } from "../types";

export async function signUpStudent(data: {
  name: string;
  phone: string;
  email: string;
  password: string;
}): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;

    await setDoc(doc(db, "students", user.uid), {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      status: "승인대기",
      createdAt: serverTimestamp(),
      createdAtIso: new Date().toISOString(),
    });

    return user;
  } catch (error: any) {
    throw new Error(getStudentAuthErrorMessage(error?.code));
  }
}

export async function loginStudent(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(getStudentAuthErrorMessage(error?.code));
  }
}

export async function logoutStudent(): Promise<void> {
  await signOut(auth);
}

export function onStudentAuthStateChanged(callback: (user: User | null) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * 현재 로그인된 계정의 students/{uid} 문서를 실시간 구독합니다.
 * 문서가 없으면(예: 관리자 계정으로 로그인한 경우) null을 전달합니다.
 *
 * ⚠️ 문서가 "존재하지 않는 것"과 "권한 오류 등으로 읽기 자체가 실패한 것"은
 * 반드시 구분해야 합니다. 둘 다 null로 처리해버리면, Firestore 규칙이 아직
 * 배포되지 않았거나 네트워크 문제가 있을 때 수강생 계정이 "프로필 없음 =
 * 관리자 계정"으로 잘못 인식되어 승인 절차 없이 자료실을 통과해버리는
 * 심각한 문제가 생깁니다(실패 시 오히려 문이 열리는 구조는 위험합니다).
 * 그래서 읽기 실패 시에는 onError로 별도 통지하고, onUpdate(null)을
 * 호출하지 않습니다.
 */
export function subscribeStudentProfile(
  uid: string,
  onUpdate: (profile: StudentProfile | null) => void,
  onError?: (error: unknown) => void
): () => void {
  return onSnapshot(
    doc(db, "students", uid),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const data = snap.data();
      onUpdate({
        uid: snap.id,
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        status: data.status || "승인대기",
        createdAt: data.createdAtIso || "",
      });
    },
    (err) => {
      console.error("수강생 프로필 구독 실패:", err);
      if (onError) {
        onError(err);
      }
    }
  );
}

function getStudentAuthErrorMessage(errorCode?: string): string {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "이미 가입된 이메일입니다. 로그인해 주세요.";
    case "auth/invalid-email":
      return "올바르지 않은 이메일 형식입니다.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 일치하지 않습니다.";
    case "auth/too-many-requests":
      return "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/weak-password":
      return "비밀번호는 6자 이상이어야 합니다.";
    default:
      return "요청을 처리하지 못했습니다. 입력 정보를 확인해 주세요.";
  }
}
