import { useEffect, useRef, useState } from 'react';
import type { GameState } from './types';
import { BoardScene } from './scene3d';
import { t } from './i18n';

interface Props {
  state: GameState;
  shown: Record<string, number>;
  highlight: number | null;
  onTile: (i: number) => void;
  onFail: () => void;
}

/** The 3D board. Falls back to the flat board (via onFail) if WebGL can't start. */
export function Board3D({ state, shown, highlight, onTile, onFail }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<BoardScene | null>(null);
  const tileRef = useRef(onTile);
  tileRef.current = onTile;
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let s: BoardScene;
    try {
      s = new BoardScene(canvas.current!, (i) => tileRef.current(i));
    } catch {
      onFail();
      return;
    }
    scene.current = s;
    const ro = new ResizeObserver(([e]) => s.resize(e.contentRect.width, e.contentRect.height));
    ro.observe(wrap.current!);
    return () => {
      ro.disconnect();
      s.dispose();
      scene.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Positions animate through a mutable map, so sync on every render.
  useEffect(() => {
    scene.current?.update({ state, shown, highlight });
  });

  useEffect(() => {
    scene.current?.setZoom(zoomed);
  }, [zoomed]);

  return (
    <div className={`stage-board${zoomed ? ' zoomed' : ''}`} ref={wrap}>
      <canvas ref={canvas} aria-label={t('Bàn cờ Polime. Chạm vào một ô để xem chi tiết.', 'Polime board. Tap a square for details.')} role="img" />
      <button type="button" className="stage-zoom" aria-pressed={zoomed} onClick={() => setZoomed((z) => !z)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 21 21M7.5 10.5h6" />
          {!zoomed && <path d="M10.5 7.5v6" />}
        </svg>
        {zoomed ? t('Toàn cảnh', 'Whole board') : t('Phóng to', 'Zoom in')}
      </button>
    </div>
  );
}
