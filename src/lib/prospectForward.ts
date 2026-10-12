/**
 * 홈페이지 상담신청 → 학원관리시스템 '상담 문의' 전달 (2026-10 변경)
 *
 * 홈페이지 상담신청은 지금처럼 이 홈페이지의 Firestore(applications)에 접수번호와 함께 저장하고,
 * 같은 내용을 학원관리시스템(academy-admin)의 '상담 문의'에도 보냅니다.
 * - 받는 곳: 학원관리시스템 Firestore의 inquiryInbox (로그인 없이 '생성'만 허용하는 공개 받은 편지함)
 *   관리자 화면이 열려 있을 때 자동으로 상담 문의에 합쳐지고, 같은 연락처면 기존 기록에 이어 붙습니다.
 * - 예비: 받은 편지함 전송이 실패하면(예: Firestore 규칙을 아직 게시하지 않음) 예전처럼
 *   국비 시스템(class-apply)의 예비 수강생 상담으로 보냅니다. 학원관리시스템으로 이전이 끝나면 이 예비 경로는 지웁니다.
 * - 전달 실패는 방문자 화면에 오류로 보이지 않습니다(홈페이지 저장이 성공했다면 접수는 정상).
 *   단, 홈페이지 저장이 실패했을 때는 이 전달이 성공하면 접수된 것으로 안내합니다.
 * - 주소를 바꾸려면 Vercel 환경변수 VITE_INQUIRY_INBOX_URL / VITE_PROSPECT_INQUIRY_URL 을 넣습니다.
 */
import type { ConsultationForm } from '../types';

/** 학원관리시스템(academy-admin-3676f) 공개 웹 API 키 — 브라우저용 공개 값이며 접근은 Firestore 규칙으로 제한됩니다. */
const ACADEMY_ADMIN_API_KEY = 'AIzaSyDm9u8U6AvRw3LeHdb7mHmcDe2MNgmyVaY';
export const INQUIRY_INBOX_URL: string =
  (import.meta as any).env?.VITE_INQUIRY_INBOX_URL ||
  `https://firestore.googleapis.com/v1/projects/academy-admin-3676f/databases/(default)/documents/inquiryInbox?key=${ACADEMY_ADMIN_API_KEY}`;

export const PROSPECT_INQUIRY_URL: string =
  (import.meta as any).env?.VITE_PROSPECT_INQUIRY_URL || 'https://class-apply.vercel.app/api/prospect-inquiry';

export interface ProspectInquiryPayload {
  name: string;
  phone: string;
  course: string;
  message: string;
  preferredTime: string;
  hasNaeilCard: string;
  userCategory: string;
  receiptNumber: string;
  consent: true;
  /** 스팸 방지용 숨김 칸 — 항상 빈 값 (자동 등록 프로그램은 홈페이지에서 먼저 걸러집니다) */
  website: '';
}

export function buildProspectInquiryPayload(form: ConsultationForm, receiptNumber?: string): ProspectInquiryPayload {
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    course: (form.courseInterest || '상담 후 결정').trim(),
    message: (form.message || '').trim(),
    preferredTime: form.preferredTime || '',
    hasNaeilCard: form.hasNaeilCard || '',
    userCategory: form.userCategory || '',
    receiptNumber: receiptNumber || '',
    consent: true,
    website: '',
  };
}

/** 01012345678 → 010-1234-5678 (학원관리시스템 규칙의 전화번호 형식에 맞춤) */
export function formatPhoneForInbox(v: string): string {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return d.startsWith('02') ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9 && d.startsWith('02')) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return String(v || '').trim();
}

const clip = (v: string, max: number) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

/** 학원관리시스템 inquiryInbox 문서 (Firestore REST 형식). 키·길이는 academy-admin firestore.rules 의 isValidInquiry와 같아야 합니다. */
export function buildInboxDocument(form: ConsultationForm, receiptNumber?: string, now = new Date()) {
  const p = buildProspectInquiryPayload(form, receiptNumber);
  const values: Record<string, string> = {
    name: clip(p.name, 50),
    phone: formatPhoneForInbox(p.phone),
    course: clip(p.course, 80),
    message: clip(p.message, 1000),
    preferredTime: clip(p.preferredTime, 60),
    userCategory: clip(p.userCategory, 60),
    hasNaeilCard: clip(p.hasNaeilCard, 40),
    receiptNumber: clip(p.receiptNumber, 40),
    submittedAt: now.toISOString(),
    source: '홈페이지',
  };
  const fields: Record<string, { stringValue: string }> = {};
  Object.keys(values).forEach((k) => { fields[k] = { stringValue: values[k] }; });
  return { fields };
}

async function postJson(url: string, body: unknown, ms = 6000): Promise<boolean> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // 방문자가 바로 다른 페이지로 이동해도 전송이 끝까지 가도록 합니다.
      keepalive: true,
      credentials: 'omit',
      signal: controller?.signal,
    });
    if (!res.ok) console.warn('[상담 전달] 거절됨:', url.split('?')[0], res.status);
    return res.ok;
  } catch (err) {
    console.warn('[상담 전달] 실패:', url.split('?')[0], err);
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 성공하면 true. 학원관리시스템 → (실패 시) 국비 시스템 순서로 보냅니다. 예외를 던지지 않습니다. */
export async function forwardInquiryToConsultApp(form: ConsultationForm, receiptNumber?: string): Promise<boolean> {
  if (await postJson(INQUIRY_INBOX_URL, buildInboxDocument(form, receiptNumber))) return true;
  return postJson(PROSPECT_INQUIRY_URL, buildProspectInquiryPayload(form, receiptNumber));
}
