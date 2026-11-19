import React from 'react';
import { X, ChevronRight, Maximize2 } from 'lucide-react';
import { useModalA11y } from '../lib/useModalA11y';

/**
 * 2027 겨울방학 특강 모집 팝업
 *
 * - 기존 개강 안내 팝업(NoticePopupModal, 관리자 설정)과 별개로 동작합니다.
 * - PC(넓은 화면)에서 기존 팝업이 가운데에 떠 있으면, 같은 크기로 나란히 붙어 표시됩니다.
 * - 휴대폰·좁은 화면에서는 기존 팝업을 닫은 뒤 이 팝업이 이어서 뜹니다.
 * - "오늘 하루 보지 않기"는 기존 팝업과 따로 저장됩니다.
 * - 개강 전날(LAST_DAY)까지만 뜨고, 그 뒤에는 자동으로 뜨지 않습니다.
 */

export const WINTER_POPUP_IMAGE = '/popups/winter-special-2027.png';
const LAST_DAY = '2027-01-10';
const HIDE_KEY = 'hide_winter_special_popup_until';

/** 한국 시간 기준 오늘 날짜 (YYYY-MM-DD) */
const todayKST = (): string => {
  try {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export const isWinterPopupActive = (): boolean => todayKST() <= LAST_DAY;

export const isWinterPopupHiddenToday = (): boolean => {
  try {
    return localStorage.getItem(HIDE_KEY) === todayKST();
  } catch {
    return false;
  }
};

export const hideWinterPopupToday = (): void => {
  try {
    localStorage.setItem(HIDE_KEY, todayKST());
  } catch (e) {
    console.warn('localStorage setItem failed:', e);
  }
};

interface WinterSpecialCardProps {
  onClose: () => void;
  onHideToday: () => void;
  onActionClick: () => void;
  className?: string;
}

/** 팝업 카드 본체 (배경 없이 카드만) — 기존 팝업 옆에 나란히 놓을 때 사용 */
export const WinterSpecialCard = React.forwardRef<HTMLDivElement, WinterSpecialCardProps>(
  ({ onClose, onHideToday, onActionClick, className = '' }, ref) => (
    <div
      ref={ref}
      id="winter-popup-card"
      role="dialog"
      aria-labelledby="winter-popup-title"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
      className={`pointer-events-auto relative w-full bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-scale-up ${className}`}
    >
      <div className="flex-1 min-h-0 flex flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
          <span
            id="winter-popup-title"
            className="inline-block bg-[#005B76] text-white font-bold text-xs px-3 py-1 rounded-full shadow"
          >
            2027 겨울방학 특강
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="닫기"
            aria-label="겨울방학 특강 팝업 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <a
          href={WINTER_POPUP_IMAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-h-0 flex items-center justify-center rounded-xl border border-slate-200 overflow-hidden bg-white"
          title="안내문 크게 보기"
        >
          <img
            src={WINTER_POPUP_IMAGE}
            alt="2027 겨울방학 자격증 특강 수강생 모집 안내 — ITQ 한글+엑셀반 오전 10~12시 1월 11일~2월 24일 25회 50시간 550,000원, 컴퓨터활용능력 2급 실기반 오후 2~4시 1월 11일~2월 16일 20회 40시간 480,000원, 교재 무료, 반별 정원 10명, 문의 033-433-1926"
            className="w-full h-full object-contain object-center"
            loading="eager"
          />
        </a>

        <div className="grid grid-cols-2 gap-2.5 mt-4 shrink-0">
          <a
            href={WINTER_POPUP_IMAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 rounded-xl border-2 border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            크게 보기
          </a>
          <button
            type="button"
            onClick={onActionClick}
            className="py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            수강 상담 신청
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <button
          type="button"
          onClick={onHideToday}
          className="underline underline-offset-2 hover:text-slate-800 transition-colors cursor-pointer"
        >
          오늘 하루 보지 않기
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
        >
          닫기
        </button>
      </div>
    </div>
  )
);
WinterSpecialCard.displayName = 'WinterSpecialCard';

interface WinterSpecialPopupProps extends WinterSpecialCardProps {
  isOpen: boolean;
}

/** 단독으로 띄울 때 (휴대폰, 또는 기존 팝업이 없을 때) */
export const WinterSpecialPopup: React.FC<WinterSpecialPopupProps> = ({
  isOpen,
  onClose,
  onHideToday,
  onActionClick,
}) => {
  const panelRef = useModalA11y(isOpen, onClose);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in bg-slate-900/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <WinterSpecialCard
        ref={panelRef}
        onClose={onClose}
        onHideToday={onHideToday}
        onActionClick={onActionClick}
        className="max-w-[25rem]"
      />
    </div>
  );
};
