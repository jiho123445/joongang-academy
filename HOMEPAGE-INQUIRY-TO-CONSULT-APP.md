# 홈페이지 상담신청 → 예비 수강생 상담(class-apply) 전달

## 동작
1. 상담신청은 지금처럼 이 홈페이지 Firestore(applications)에 접수번호와 함께 저장합니다.
2. 같은 내용을 class-apply 관리자 '예비 수강생 상담'에도 보냅니다 (src/lib/prospectForward.ts).
3. 홈페이지 저장이 성공하면 전달 결과와 관계없이 접수 완료로 안내합니다.
   홈페이지 저장이 실패해도 전달이 성공하면 접수 완료로 안내합니다(둘 다 실패할 때만 오류).

## 바뀐 파일
- src/lib/prospectForward.ts (새 파일)
- src/components/InquirySection.tsx (제출 처리만 변경, 화면 그대로)
- vercel.json (CSP connect-src에 https://class-apply.vercel.app 추가)

## 참고
- class-apply는 https://jahrd.co.kr, https://www.jahrd.co.kr 에서 보낸 요청만 받습니다.
  vercel.app 미리보기 주소에서 신청하면 홈페이지에는 저장되지만 상담 앱으로는 전달되지 않습니다.
- 받는 주소를 바꾸려면 Vercel 환경변수 VITE_PROSPECT_INQUIRY_URL 을 넣고 다시 배포합니다.
