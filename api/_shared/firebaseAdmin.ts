/**
 * firebaseAdmin.ts - Firebase Admin SDK 초기화 (서버 전용)
 *
 * ⚠️ 이 모듈은 Vercel 서버리스 함수(api/)에서만 사용됩니다. 브라우저(클라이언트)
 * 코드에서는 절대 import하면 안 됩니다 - 서비스 계정 비밀키가 노출됩니다.
 *
 * 관리자가 수강생 계정을 "완전히" 삭제(Firebase Authentication 로그인 계정
 * 자체까지)하려면 Admin SDK가 필요합니다. 일반 클라이언트 SDK는 본인 계정만
 * 삭제할 수 있고 다른 사람 계정은 지울 수 없기 때문입니다.
 *
 * 배포 전 필수 설정: Vercel 환경변수에 FIREBASE_SERVICE_ACCOUNT_KEY를
 * 등록해야 합니다. 자세한 방법은 SECURITY_SETUP.md를 참고하세요.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다. Vercel 환경변수 설정이 필요합니다 (SECURITY_SETUP.md 참고)."
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY 값이 올바른 JSON 형식이 아닙니다.");
  }
}

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }
  cachedApp = initializeApp({ credential: cert(getServiceAccount()) });
  return cachedApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
