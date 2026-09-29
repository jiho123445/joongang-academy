import React from 'react';
import { X, ChevronRight, MapPin, Phone } from 'lucide-react';
import { useModalA11y } from '../lib/useModalA11y';

export type ScheduleLabelColor = 'blue' | 'emerald' | 'amber' | 'purple';

export interface ScheduleItem {
  courseName: string;
  startDate: string;
  timeSlot: string;
  /** 과정 박스 왼쪽 위 작은 분류 글씨 (예: "모집중 · 국비지원", "시니어"). 비우면 표시 안 함 */
  label?: string;
  /** 분류 글씨 색 (홈 화면 인기 강좌 카드와 같은 4가지) */
  labelColor?: ScheduleLabelColor;
  /** 과정명 아래 한 줄 설명 (예: "교재비 무료 · 최대 100% 정부지원"). 비우면 표시 안 함 */
  description?: string;
}

export type PopupSize = 'small' | 'medium' | 'large';
export type PopupPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const POPUP_SIZE_OPTIONS: { value: PopupSize; label: string }[] = [
  { value: 'small', label: '작게' },
  { value: 'medium', label: '보통' },
  { value: 'large', label: '크게' },
];

export const POPUP_POSITION_OPTIONS: { value: PopupPosition; label: string }[] = [
  { value: 'center', label: '가운데' },
  { value: 'top-left', label: '왼쪽 위' },
  { value: 'top-right', label: '오른쪽 위' },
  { value: 'bottom-left', label: '왼쪽 아래' },
  { value: 'bottom-right', label: '오른쪽 아래' },
];

export const SCHEDULE_LABEL_COLOR_OPTIONS: { value: ScheduleLabelColor; label: string }[] = [
  { value: 'blue', label: '파랑' },
  { value: 'emerald', label: '초록' },
  { value: 'amber', label: '주황' },
  { value: 'purple', label: '보라' },
];

export interface PopupNoticeConfig {
  enabled: boolean;
  badgeText: string;
  title: string;
  subtitle: string;
  content: string;
  dateText: string;
  schedules?: ScheduleItem[];
  actionText: string;
  /** 우측 하단 "공지 다시보기" 플로팅 버튼에 표시되는 짧은 문구.
   *  비워두면(=falsy) 상단 뱃지 문구(badgeText)를 그대로 사용해
   *  팝업 뱃지 문구가 바뀌면 플로팅 버튼 문구도 함께 바뀐다. */
  buttonLabel?: string;
  /** 팝업 크기 (기본: 보통) */
  popupSize?: PopupSize;
  /** 팝업 위치 (기본: 가운데). 휴대폰처럼 좁은 화면에서는 항상 가운데 */
  popupPosition?: PopupPosition;
  updatedAt?: string;
}

interface NoticePopupModalProps {
  noticeConfig: PopupNoticeConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onActionClick: () => void;
  onHideToday: () => void;
}

// 홈 화면 "실시간 인기 수강 강좌" 카드와 같은 색 규칙
export const SCHEDULE_COLOR_CLASSES: Record<ScheduleLabelColor, { border: string; text: string }> = {
  blue: { border: 'border-blue-100', text: 'text-blue-600' },
  emerald: { border: 'border-emerald-100', text: 'text-emerald-600' },
  amber: { border: 'border-amber-100', text: 'text-amber-600' },
  purple: { border: 'border-purple-100', text: 'text-purple-600' },
};

const SIZE_CLASSES: Record<PopupSize, { width: string; title: string; body: string; item: string; small: string }> = {
  small: { width: 'sm:max-w-[21rem]', title: 'text-lg', body: 'text-[13px]', item: 'text-[13px]', small: 'text-[11px]' },
  medium: { width: 'sm:max-w-[25rem]', title: 'text-xl', body: 'text-sm', item: 'text-sm', small: 'text-xs' },
  large: { width: 'sm:max-w-[29rem]', title: 'text-2xl', body: 'text-[15px]', item: 'text-[15px]', small: 'text-[13px]' },
};

// 휴대폰(sm 미만)에서는 항상 가운데, sm 이상에서만 지정 위치 적용
const POSITION_CLASSES: Record<PopupPosition, string> = {
  center: 'items-center justify-center',
  'top-left': 'items-center justify-center sm:items-start sm:justify-start sm:p-6',
  'top-right': 'items-center justify-center sm:items-start sm:justify-end sm:p-6',
  'bottom-left': 'items-center justify-center sm:items-end sm:justify-start sm:p-6',
  'bottom-right': 'items-center justify-center sm:items-end sm:justify-end sm:p-6',
};

export const NoticePopupModal: React.FC<NoticePopupModalProps> = ({
  noticeConfig,
  isOpen,
  onClose,
  onActionClick,
  onHideToday,
}) => {
  const shouldShow = isOpen && !!noticeConfig && noticeConfig.enabled;
  const panelRef = useModalA11y(shouldShow, onClose);

  if (!shouldShow) return null;

  const size = SIZE_CLASSES[noticeConfig.popupSize || 'medium'] || SIZE_CLASSES.medium;
  const position: PopupPosition = noticeConfig.popupPosition || 'center';
  const isCorner = position !== 'center';

  const schedules = (noticeConfig.schedules || []).filter(
    (item) => item.courseName || item.startDate || item.timeSlot
  );

  return (
    <div
      className={`fixed inset-0 z-[100] flex p-4 animate-fade-in bg-slate-900/60 ${
        // 모서리 위치일 때 PC에서는 배경을 어둡게 하지 않고 홈페이지를 그대로 쓸 수 있게 함
        isCorner ? 'sm:bg-transparent sm:pointer-events-none' : 'backdrop-blur-[2px]'
      } ${POSITION_CLASSES[position]}`}
      onClick={onClose}
    >
      <div
        id="notice-popup-card"
        ref={panelRef}
        role="dialog"
        aria-modal={isCorner ? undefined : true}
        aria-labelledby="notice-popup-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`pointer-events-auto relative w-full max-w-[25rem] ${size.width} bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-scale-up`}
      >
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* 뱃지 + 닫기 */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-block bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold text-xs px-3 py-1 rounded-full shadow">
              {noticeConfig.badgeText || '개강 안내'}
            </span>
            <button
              type="button"
              onClick={onClose}
              id="notice-popup-close-x"
              className="p-1.5 -mr-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="닫기"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 제목 / 부제목 / 본문 */}
          <h2 id="notice-popup-title" className={`${size.title} font-extrabold text-slate-800 leading-snug`}>
            {noticeConfig.title}
          </h2>
          {noticeConfig.subtitle && (
            <p className={`${size.small} text-slate-500 mt-1`}>{noticeConfig.subtitle}</p>
          )}
          {noticeConfig.content && (
            <p className={`${size.body} text-slate-600 leading-relaxed whitespace-pre-line mt-3`}>
              {noticeConfig.content}
            </p>
          )}

          {/* 과정별 일정 — 홈 화면 인기 강좌 카드와 같은 모양 */}
          {schedules.length > 0 ? (
            <div className="space-y-2.5 mt-4">
              {schedules.map((item, idx) => {
                const color = SCHEDULE_COLOR_CLASSES[item.labelColor || 'blue'] || SCHEDULE_COLOR_CLASSES.blue;
                return (
                  <div key={idx} className={`p-3.5 bg-white rounded-2xl border ${color.border} shadow-sm`}>
                    {(item.label || item.startDate || item.timeSlot) && (
                      <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 mb-1">
                        <span className={`${size.small} font-bold ${color.text}`}>{item.label}</span>
                        <div className={`flex items-center gap-2 ${size.small} text-slate-400 font-mono`}>
                          {item.startDate && (
                            <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              {item.startDate}
                            </span>
                          )}
                          {item.timeSlot && <span>{item.timeSlot}</span>}
                        </div>
                      </div>
                    )}
                    <h3 className={`${size.item} font-bold text-slate-800`}>{item.courseName || '과정명'}</h3>
                    {item.description && (
                      <p className={`${size.small} text-slate-500 mt-0.5`}>{item.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : noticeConfig.dateText ? (
            <div className="mt-4 p-3.5 bg-white rounded-2xl border border-blue-100 shadow-sm">
              <span className={`${size.small} font-bold text-blue-600`}>개강 일정</span>
              <p className={`${size.item} font-bold text-slate-800 mt-0.5`}>{noticeConfig.dateText}</p>
            </div>
          ) : null}

          {/* 신청 버튼 */}
          <button
            type="button"
            onClick={onActionClick}
            id="notice-popup-apply-btn"
            className="w-full mt-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{noticeConfig.actionText || '온라인 수강신청하기'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 mt-2.5">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              홍천읍 신장대로 48, 2층
            </span>
            <a href="tel:0334331926" className="flex items-center gap-1 hover:text-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              033-433-1926
            </a>
          </div>
        </div>

        {/* 하단: 오늘 하루 보지 않기 / 닫기 */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <button
            type="button"
            onClick={onHideToday}
            id="notice-popup-hide-today"
            className="underline underline-offset-2 hover:text-slate-800 transition-colors cursor-pointer"
          >
            오늘 하루 보지 않기
          </button>
          <button
            type="button"
            onClick={onClose}
            id="notice-popup-close-btn"
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
