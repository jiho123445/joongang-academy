/**
 * 홈페이지 상담신청 → 예비 수강생 상담(class-apply) 전달
 *
 * 홈페이지 상담신청은 지금처럼 이 홈페이지의 Firestore(applications)에 접수번호와 함께 저장하고,
 * 같은 내용을 class-apply 관리자 화면의 '예비 수강생 상담'에도 보냅니다.
 * - 받는 곳: POST https://class-apply.vercel.app/api/prospect-inquiry
 *   (jahrd.co.kr · www.jahrd.co.kr 에서 보낸 요청만 받습니다)
 * - 같은 연락처가 이미 있으면 상담 앱이 새 사람을 만들지 않고 기존 기록에 이어 붙입니다.
 * - 전달 실패는 방문자 화면에 오류로 보이지 않습니다(홈페이지 저장이 성공했다면 접수는 정상).
 *   단, 홈페이지 저장이 실패했을 때는 이 전달이 성공하면 접수된 것으로 안내합니다.
 * - 주소를 바꾸려면 Vercel 환경변수 VITE_PROSPECT_INQUIRY_URL 을 넣습니다.
 */
import type { ConsultationForm } from '../types';

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

/** 성공하면 true. 네트워크 오류·거절·시간 초과(6초)는 false (예외를 던지지 않습니다). */
export async function forwardInquiryToConsultApp(form: ConsultationForm, receiptNumber?: string): Promise<boolean> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 6000) : null;
  try {
    const res = await fetch(PROSPECT_INQUIRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildProspectInquiryPayload(form, receiptNumber)),
      // 방문자가 바로 다른 페이지로 이동해도 전송이 끝까지 가도록 합니다.
      keepalive: true,
      credentials: 'omit',
      signal: controller?.signal,
    });
    if (!res.ok) console.warn('[상담 앱 전달] 거절됨:', res.status);
    return res.ok;
  } catch (err) {
    console.warn('[상담 앱 전달] 실패:', err);
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
