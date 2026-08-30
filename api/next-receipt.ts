import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

/**
 * POST /api/next-receipt
 * body: {} (인증 불필요 — 수강신청 자체가 비로그인 방문자 기능이므로, 이
 * 엔드포인트도 비로그인으로 호출됩니다. 대신 서버(Admin SDK)에서만 채번하게
 * 만들어, 클라이언트가 counters 문서를 직접 건드릴 수 없게 막는 것이 목적입니다.)
 *
 * ⚠️ Firebase Admin SDK 초기화 로직을 별도 공유 파일로 분리하지 않고 이 파일
 * 안에 직접 포함했습니다. api/delete-student.ts에 남아있는 기록대로, 별도
 * 파일로 분리하면 Vercel 배포 환경에서 "Cannot find module .../_shared/..."
 * 오류로 함수 자체가 실행되지 못한 전례가 있었기 때문입니다.
 *
 * 기존 방식(클라이언트가 직접 counters/{YYMM} 문서에 Firestore 트랜잭션을
 * 거는 방식)의 문제: firestore.rules상 counters는 "이전 값 + 1"로만 증가를
 * 허용했지만, 그래도 익명 사용자가 반복 호출해 카운터를 임의로 소진시킬 수
 * 있었습니다(개인정보 유출은 아니지만 접수번호가 듬성듬성해짐). 이제는
 * counters 컬렉션 자체를 관리자 전용으로 잠그고(firestore.rules 참고),
 * 채번은 이 서버리스 함수(Admin SDK, 규칙 우회)에서만 이뤄지도록 구조를
 * 바꿨습니다.
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20; // IP당 분당 최대 20회 — 정상적인 신청 폭주(단체 신청 등)는 통과시키되, 무한 반복 남용은 막는 선
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  // 메모리 누수 방지: 가끔 오래된 IP 항목을 정리합니다.
  if (requestLog.size > 500) {
    for (const [key, ts] of requestLog) {
      if (ts.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(key);
    }
  }
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY 값이 올바른 JSON 형식이 아닙니다.");
  }
}

function getAdminApp() {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  return initializeApp({ credential: cert(getServiceAccount()) });
}

function getYYMMKey(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
    return;
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  const clientIp =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(clientIp)) {
    res.status(429).json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." });
    return;
  }

  let db: FirebaseFirestore.Firestore;
  try {
    const app = getAdminApp();
    db = getFirestore(app);
  } catch (configErr: any) {
    console.error("Firebase Admin SDK 초기화 실패:", configErr);
    res.status(500).json({ error: "SERVICE_ACCOUNT_NOT_CONFIGURED" });
    return;
  }

  try {
    const targetYYMM = getYYMMKey(new Date());
    const counterRef = db.collection("counters").doc(targetYYMM);

    const nextSeq = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = snap.exists ? Number(snap.data()?.count) || 0 : 0;
      const next = current + 1;
      transaction.set(
        counterRef,
        { count: next, updatedAt: Timestamp.now() },
        { merge: true }
      );
      return next;
    });

    res.status(200).json({ receiptNumber: `${targetYYMM}-${nextSeq}` });
  } catch (error: any) {
    console.error("접수번호 채번 실패:", error);
    res.status(500).json({ error: "접수번호 발급에 실패했습니다." });
  }
}
