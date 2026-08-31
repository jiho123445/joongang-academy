import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyCoOTPMuFwHfjImBNm_5oeDUc19L95QrT8",
  authDomain: "joongang-homepage.firebaseapp.com",
  projectId: "joongang-homepage",
  storageBucket: "joongang-homepage.firebasestorage.app",
  messagingSenderId: "900862217013",
  appId: "1:900862217013:web:1447083d7547ad18739a7c",
  measurementId: "G-7YS05VJCBY"
};

// Initialize Firebase App, Firestore DB, Auth & Storage
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// App Check (2026-08 준비, 아직 비활성) — 이 요청이 실제로 우리 홈페이지
// 앱에서 온 것인지 확인해, 브라우저 화면을 거치지 않고 Firestore API를
// 직접 스크립트로 호출하는 종류의 스팸/악용을 막아주는 추가 보안 계층입니다.
//
// VITE_RECAPTCHA_SITE_KEY 환경변수가 설정돼 있을 때만 초기화를 시도합니다.
// 아직 설정 전이라면(지금은 비어있음) 이 블록은 그냥 조용히 건너뛰고,
// 사이트는 지금과 완전히 동일하게 작동합니다 - 즉 이 코드를 배포해도
// 지금 당장은 아무 것도 바뀌지 않습니다.
//
// 실제로 켜려면 순서대로:
// 1. Firebase 콘솔 → 앱 확인(App Check) → 웹 앱 등록 → reCAPTCHA v3
//    공급자 선택 → 사이트 키 발급 (jahrd.co.kr 도메인 등록)
// 2. Vercel 프로젝트 환경변수에 VITE_RECAPTCHA_SITE_KEY = 발급받은 키 추가
// 3. 재배포 후, Firebase 콘솔 App Check에서 Firestore/Storage가
//    "모니터링" 상태로 정상 인증되는지 며칠 지켜보기
// 4. 문제 없으면 그때 Firestore/Storage를 "적용(Enforce)"로 전환
//    (3, 4단계를 건너뛰고 바로 적용하면, 아직 앱이 인증되지 않은 상태의
//    방문자 요청이 전부 거부될 수 있어 위험합니다.)
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
if (recaptchaSiteKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // App Check 초기화가 실패해도 사이트의 다른 기능(로그인, 자료실 등)에는
    // 영향이 없도록 조용히 경고만 남깁니다.
    console.warn("App Check 초기화 실패 (사이트 나머지 기능은 정상 작동합니다):", err);
  }
}
