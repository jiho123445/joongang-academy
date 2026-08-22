import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * POST /api/set-student-approval
 * body: { uid: string, status: '승인됨' | '거절됨' | '승인대기' }
 * header: Authorization: Bearer <관리자 계정의 Firebase ID 토큰>
 *
 * 수강생의 Firestore 승인 상태를 바꾸는 동시에, Firebase Authentication의
 * Custom Claims에 approved: true/false를 심어줍니다.
 *
 * 왜 필요한가: Firestore 규칙은 "승인된 수강생만 자료 목록 조회 가능"으로
 * 잘 막아뒀지만, 실제 파일이 저장된 Storage 쪽은 예전에 "로그인만 하면 접근
 * 가능"이라는 더 느슨한 규칙을 쓰고 있었습니다(Storage 규칙에서 Firestore를
 * 조회하는 cross-service 방식은 별도의 콘솔 승인 절차가 필요하고, 그 절차를
 * 놓치면 조용히 전부 막혀버리는 문제를 이전에 겪었기 때문입니다).
 *
 * Custom Claims는 로그인 토큰 자체에 "승인됨" 여부를 담아두는 방식이라,
 * Storage 규칙에서 Firestore를 다시 조회할 필요 없이 바로 확인할 수 있어
 * 이 문제를 근본적으로 해결합니다.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const { uid, status } = req.body || {};

  const validStatuses = ["승인됨", "거절됨", "승인대기"];
  if (!idToken || typeof uid !== "string" || !uid || !validStatuses.includes(status)) {
    res.status(400).json({ error: "잘못된 요청입니다." });
    return;
  }

  function getServiceAccount() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.");
    return JSON.parse(raw);
  }

  function getAdminApp() {
    const existing = getApps();
    if (existing.length > 0) return existing[0];
    return initializeApp({ credential: cert(getServiceAccount()) });
  }

  let adminAuth;
  let adminDb;
  try {
    const app = getAdminApp();
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  } catch (configErr: any) {
    console.error("Firebase Admin SDK 초기화 실패:", configErr);
    res.status(500).json({ error: "SERVICE_ACCOUNT_NOT_CONFIGURED" });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const callerUid = decoded.uid;

    const adminDoc = await adminDb.collection("admins").doc(callerUid).get();
    if (!adminDoc.exists) {
      res.status(403).json({ error: "관리자 권한이 없습니다." });
      return;
    }

    // 1. Firestore 상태 변경
    await adminDb.collection("students").doc(uid).update({ status });

    // 2. Custom Claims 설정 (승인됨일 때만 approved: true, 그 외에는 false로
    //    명시적으로 지워서 예전 승인 상태가 토큰에 남아있지 않게 합니다.)
    await adminAuth.setCustomUserClaims(uid, { approved: status === "승인됨" });

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("수강생 승인 처리 실패:", error);
    res.status(500).json({ error: "처리 중 오류가 발생했습니다." });
  }
}
