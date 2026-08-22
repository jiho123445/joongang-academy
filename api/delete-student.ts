import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb } from "./_shared/firebaseAdmin";

/**
 * POST /api/delete-student
 * body: { uid: string }
 * header: Authorization: Bearer <관리자 계정의 Firebase ID 토큰>
 *
 * 요청자가 실제로 admins 컬렉션에 등록된 관리자인지 서버에서 직접 검증한 뒤,
 * 대상 계정의 Firebase Authentication 로그인 정보와 Firestore students 문서를
 * 모두 삭제합니다. 클라이언트 SDK만으로는 다른 사람의 Auth 계정을 지울 수
 * 없어서, 이 서버리스 함수가 필요합니다.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const { uid } = req.body || {};

  if (!idToken || typeof uid !== "string" || !uid) {
    res.status(400).json({ error: "잘못된 요청입니다." });
    return;
  }

  let adminAuth;
  let adminDb;
  try {
    adminAuth = getAdminAuth();
    adminDb = getAdminDb();
  } catch (configErr: any) {
    console.error("Firebase Admin SDK 초기화 실패:", configErr);
    res.status(500).json({ error: "SERVICE_ACCOUNT_NOT_CONFIGURED" });
    return;
  }

  try {
    // 1. 요청자 신원 확인 (ID 토큰 검증)
    const decoded = await adminAuth.verifyIdToken(idToken);
    const callerUid = decoded.uid;

    // 2. 요청자가 실제 관리자인지 확인 (admins 컬렉션, 규칙 우회 가능한 Admin SDK 사용)
    const adminDoc = await adminDb.collection("admins").doc(callerUid).get();
    if (!adminDoc.exists) {
      res.status(403).json({ error: "관리자 권한이 없습니다." });
      return;
    }

    // 3. 대상 계정의 Authentication 로그인 정보와 Firestore 프로필을 함께 삭제
    const results = await Promise.allSettled([
      adminAuth.deleteUser(uid),
      adminDb.collection("students").doc(uid).delete(),
    ]);

    const authResult = results[0];
    // auth/user-not-found(이미 삭제된 계정)는 실패로 취급하지 않습니다.
    if (authResult.status === "rejected" && (authResult.reason as any)?.code !== "auth/user-not-found") {
      console.error("Auth 계정 삭제 실패:", authResult.reason);
      res.status(500).json({ error: "로그인 계정 삭제 중 오류가 발생했습니다." });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("수강생 계정 삭제 처리 실패:", error);
    res.status(401).json({ error: "인증 확인에 실패했습니다. 다시 로그인 후 시도해 주세요." });
  }
}
