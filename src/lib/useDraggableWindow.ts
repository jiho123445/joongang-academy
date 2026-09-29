import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

/**
 * 관리자 창처럼 "제목줄을 끌어서 이동 + 오른쪽 아래 모서리로 크기 조절"이 되는 창을 위한 훅.
 *
 * - 마지막 위치·크기를 localStorage에 기억해 다음에 열 때 그대로 복원합니다.
 * - 화면이 좁은 기기(768px 미만)에서는 이동/크기 조절 없이 항상 전체 화면으로 표시합니다.
 * - transform 대신 left/top을 쓰는 이유: 창 안의 확인창·비밀번호 변경창이 `position: fixed`를
 *   쓰는데, 부모에 transform이 있으면 fixed 기준이 창 안으로 바뀌어 위치가 어긋나기 때문입니다.
 */

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Options {
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
}

const MOBILE_BREAKPOINT = 768;
const EDGE_MARGIN = 8;

const getViewport = () => ({
  vw: typeof window !== 'undefined' ? window.innerWidth : 1280,
  vh: typeof window !== 'undefined' ? window.innerHeight : 800,
});

function clampRect(rect: WindowRect, minW: number, minH: number): WindowRect {
  const { vw, vh } = getViewport();
  const w = Math.max(Math.min(rect.w, vw - EDGE_MARGIN * 2), Math.min(minW, vw - EDGE_MARGIN * 2));
  const h = Math.max(Math.min(rect.h, vh - EDGE_MARGIN * 2), Math.min(minH, vh - EDGE_MARGIN * 2));
  const x = Math.min(Math.max(rect.x, EDGE_MARGIN), Math.max(EDGE_MARGIN, vw - w - EDGE_MARGIN));
  const y = Math.min(Math.max(rect.y, EDGE_MARGIN), Math.max(EDGE_MARGIN, vh - h - EDGE_MARGIN));
  return { x, y, w, h };
}

function centeredRect(defaultWidth: number, defaultHeight: number): WindowRect {
  const { vw, vh } = getViewport();
  const w = Math.min(defaultWidth, vw - 48);
  const h = Math.min(defaultHeight, Math.round(vh * 0.9));
  return { x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2), w, h };
}

function loadRect(key: string): WindowRect | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (['x', 'y', 'w', 'h'].every((k) => typeof parsed?.[k] === 'number')) return parsed as WindowRect;
  } catch {
    /* 저장된 값이 없거나 깨졌으면 기본 위치 사용 */
  }
  return null;
}

export function useDraggableWindow({
  storageKey,
  defaultWidth,
  defaultHeight,
  minWidth = 640,
  minHeight = 420,
}: Options) {
  const [isMobile, setIsMobile] = useState(() => getViewport().vw < MOBILE_BREAKPOINT);
  const [isMaximized, setIsMaximized] = useState(false);
  const [rect, setRect] = useState<WindowRect>(() =>
    clampRect(loadRect(storageKey) ?? centeredRect(defaultWidth, defaultHeight), minWidth, minHeight)
  );
  const rectRef = useRef(rect);
  rectRef.current = rect;

  const save = useCallback(
    (r: WindowRect) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(r));
      } catch {
        /* 저장 실패해도 동작에는 영향 없음 */
      }
    },
    [storageKey]
  );

  // 브라우저 창 크기가 바뀌면 관리자 창이 화면 밖으로 나가지 않게 보정
  useEffect(() => {
    const onResize = () => {
      setIsMobile(getViewport().vw < MOBILE_BREAKPOINT);
      setRect((prev) => clampRect(prev, minWidth, minHeight));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [minWidth, minHeight]);

  // 창 DOM을 직접 가리키는 ref. 끄는 동안에는 React 상태를 바꾸지 않고
  // 이 요소의 style만 바꿔서, 3천 줄이 넘는 관리자 화면 전체가 매번 다시
  // 그려지지 않게 합니다 (이동이 느리던 원인). 손을 떼는 순간에만 상태에 반영.
  const windowRef = useRef<HTMLDivElement | null>(null);

  const startInteraction = useCallback(
    (e: ReactPointerEvent, mode: 'move' | 'resize') => {
      if (isMobile || isMaximized) return;
      if (e.button !== 0) return;
      if (mode === 'move' && (e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
      const el = windowRef.current;
      if (!el) return;
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const start = rectRef.current;
      let latest = start;
      let frame = 0;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      el.style.willChange = mode === 'move' ? 'left, top' : 'width, height';

      const apply = () => {
        frame = 0;
        el.style.left = `${latest.x}px`;
        el.style.top = `${latest.y}px`;
        el.style.width = `${latest.w}px`;
        el.style.height = `${latest.h}px`;
      };

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const next =
          mode === 'move'
            ? { ...start, x: start.x + dx, y: start.y + dy }
            : { ...start, w: Math.max(minWidth, start.w + dx), h: Math.max(minHeight, start.h + dy) };
        latest = clampRect(next, minWidth, minHeight);
        if (!frame) frame = requestAnimationFrame(apply); // 화면 새로고침 주기에 맞춰 한 번만
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (frame) cancelAnimationFrame(frame);
        apply();
        el.style.willChange = '';
        document.body.style.userSelect = prevUserSelect;
        rectRef.current = latest;
        setRect(latest);
        save(latest);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [isMobile, isMaximized, minWidth, minHeight, save]
  );

  const toggleMaximize = useCallback(() => setIsMaximized((v) => !v), []);

  const resetPosition = useCallback(() => {
    const r = clampRect(centeredRect(defaultWidth, defaultHeight), minWidth, minHeight);
    setRect(r);
    setIsMaximized(false);
    save(r);
  }, [defaultWidth, defaultHeight, minWidth, minHeight, save]);

  const fullScreen = isMobile || isMaximized;
  const style: CSSProperties = fullScreen
    ? { left: 0, top: 0, width: '100%', height: '100%' }
    : { left: rect.x, top: rect.y, width: rect.w, height: rect.h };

  return {
    windowRef,
    style,
    isMobile,
    isMaximized,
    isFullScreen: fullScreen,
    toggleMaximize,
    resetPosition,
    onDragStart: (e: ReactPointerEvent) => startInteraction(e, 'move'),
    onResizeStart: (e: ReactPointerEvent) => startInteraction(e, 'resize'),
  };
}
