import type { CSSProperties } from 'react';
import type { Player, TokenId } from './types';

const cut = { fill: 'var(--tk-cut, #000)', fillOpacity: 0.45 } as const;
const cutStroke = { stroke: 'var(--tk-cut, #000)', strokeOpacity: 0.4, fill: 'none' } as const;
const line = { stroke: 'currentColor', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Hand-drawn Vietnamese tokens. They paint with currentColor; --tk-cut colours the cut-out details. */
export function TokenIcon({ id, size = 24 }: { id: TokenId; size?: number | string }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;
  switch (id) {
    case 'non-la':
      return (
        <svg {...p}>
          <path d="M12 3.2 22.2 16.1Q12 19.8 1.8 16.1Z" />
          <path d="M12 3.6 7.4 17.2M12 3.6 16.6 17.2M12 3.6v14.6" {...cutStroke} strokeWidth="0.8" />
          <path d="M7.2 17.2q4.8 5.4 9.6 0" {...line} strokeWidth="1.1" />
        </svg>
      );
    case 'hoa-sen':
      return (
        <svg {...p}>
          <path d="M12 3.5c2.6 3 2.6 8 0 11.6-2.6-3.6-2.6-8.6 0-11.6Z" />
          <path d="M11.4 15.4C7.6 15 4.8 12 4.3 7.6c3.6 1 6.3 3.8 7.1 7.8ZM12.6 15.4c3.8-.4 6.6-3.4 7.1-7.8-3.6 1-6.3 3.8-7.1 7.8Z" />
          <path d="M11.6 16.2c-3.9.6-7.4-.5-9.6-3.1 3.6-.6 7 .6 9.6 3.1ZM12.4 16.2c3.9.6 7.4-.5 9.6-3.1-3.6-.6-7 .6-9.6 3.1Z" />
          <path d="M6 19.6h12M8.5 21.6h7" {...line} strokeWidth="1.2" />
        </svg>
      );
    case 'pho':
      return (
        <svg {...p}>
          <path d="M2.8 11.2h18.4c0 4.7-4 8.3-9.2 8.3S2.8 15.9 2.8 11.2Z" />
          <rect x="8.6" y="19.3" width="6.8" height="1.8" rx="0.6" />
          <path d="M5 13.6h14" {...cutStroke} strokeWidth="1" />
          <path d="M12.6 10.4 19.8 2.8M15.2 10.4 21.6 4.6" {...line} strokeWidth="1.3" />
          <path d="M6.6 9.2c-1-1.4 1-2.4 0-3.9M9.6 9.2c-1-1.4 1-2.4 0-3.9" {...line} strokeWidth="1.1" />
        </svg>
      );
    case 'xe-may':
      return (
        <svg {...p}>
          <path d="M3.4 15.4C3.6 12.8 5.6 11.6 8.4 11.6h4.6l2.4-5.2h2.8v1.3h-1.9l-1.9 4.6c2.6-.3 5.2.8 6.1 3.1Z" />
          <path d="M5.8 10.6h5.6c0-1-1-1.5-2.4-1.5H6.6c-.6 0-.8.6-.8 1.5Z" />
          <circle cx="6.3" cy="17.2" r="2.9" />
          <circle cx="17.8" cy="17.2" r="2.9" />
          <circle cx="6.3" cy="17.2" r="1.1" {...cut} />
          <circle cx="17.8" cy="17.2" r="1.1" {...cut} />
        </svg>
      );
    case 'trau':
      return (
        <svg {...p}>
          <path d="M2.6 6c.4 4 3.6 5.4 6.4 4.8l.4-1.6C7 9.3 4.8 8.4 2.6 6ZM21.4 6c-.4 4-3.6 5.4-6.4 4.8l-.4-1.6c2.4.1 4.6-.8 6.8-3.2Z" />
          <path d="M8.6 9.6c1.4-1 5.4-1 6.8 0 .8 2.9.2 5.4-.8 7.6-.6 2.6-4.6 2.6-5.2 0-1-2.2-1.6-4.7-.8-7.6Z" />
          <path d="M8.8 11c-1.8 0-2.9.8-3.3 1.7 1.5.3 2.7 0 3.5-.7ZM15.2 11c1.8 0 2.9.8 3.3 1.7-1.5.3-2.7 0-3.5-.7Z" />
          <circle cx="10.3" cy="12.7" r="0.6" {...cut} />
          <circle cx="13.7" cy="12.7" r="0.6" {...cut} />
          <ellipse cx="10.9" cy="17.3" rx="0.6" ry="0.75" {...cut} />
          <ellipse cx="13.1" cy="17.3" rx="0.6" ry="0.75" {...cut} />
        </svg>
      );
    case 'den-long':
      return (
        <svg {...p}>
          <path d="M12 1.4v2.2" {...line} strokeWidth="1.1" />
          <rect x="9.4" y="3.4" width="5.2" height="1.7" rx="0.5" />
          <path d="M12 5.1c5 0 6.6 3.4 6.6 6.4s-1.6 6.4-6.6 6.4-6.6-3.4-6.6-6.4 1.6-6.4 6.6-6.4Z" />
          <path d="M12 5.4v12.2M8.9 5.7c-1.5 3.4-1.5 8.2 0 11.6M15.1 5.7c1.5 3.4 1.5 8.2 0 11.6M5.6 11.5h12.8" {...cutStroke} strokeWidth="0.8" />
          <rect x="9.4" y="17.9" width="5.2" height="1.5" rx="0.5" />
          <path d="M12 19.4v3.2M10.6 19.6l-.7 2.6M13.4 19.6l.7 2.6" {...line} strokeWidth="1" />
        </svg>
      );
    case 'ca-phe':
      return (
        <svg {...p}>
          <rect x="11" y="1.6" width="2" height="1.6" rx="0.5" />
          <rect x="8" y="3" width="8" height="1.6" rx="0.6" />
          <path d="M8.4 5h7.2l-.5 4.4H8.9Z" />
          <rect x="5.8" y="9.6" width="12.4" height="1.5" rx="0.6" />
          <path d="M7.4 11.6h9.2v4.5c0 2.4-2 4-4.6 4s-4.6-1.6-4.6-4Z" />
          <path d="M16.6 12.6c2.8 0 2.8 4 0 4" {...line} strokeWidth="1.3" />
          <rect x="5.2" y="20.6" width="13.6" height="1.3" rx="0.6" />
          <path d="M9 14h6" {...cutStroke} strokeWidth="1" />
        </svg>
      );
    case 'xich-lo':
      return (
        <svg {...p}>
          <path d="M2.6 6.8C3.6 3.8 7.4 3.1 10.2 4.8" {...line} strokeWidth="1.3" />
          <path d="M3.4 9.2c0-1.8 1.4-2.8 3.4-2.8h2.6l.9 7.4H4.4c-.6 0-1-.5-1-1.1Z" />
          <path d="M8.6 13.8 18.6 17.4M15.6 15.6l-.5-5.2M7 13.8l-.8 3.4" {...line} strokeWidth="1.5" />
          <rect x="13.6" y="9.4" width="3.2" height="1.2" rx="0.5" />
          <circle cx="6" cy="17.6" r="2.9" />
          <circle cx="18.6" cy="17.6" r="2.9" />
          <circle cx="6" cy="17.6" r="1.1" {...cut} />
          <circle cx="18.6" cy="17.6" r="1.1" {...cut} />
        </svg>
      );
  }
}

export function TokenDisc({ player, size, style, ring }: { player: Pick<Player, 'token' | 'color'>; size: number | string; style?: CSSProperties; ring?: boolean }) {
  return (
    <span
      className={`disc${ring ? ' disc-ring' : ''}`}
      style={{ width: size, height: size, ['--pc' as string]: player.color, ['--tk-cut' as string]: player.color, ...style }}
    >
      <TokenIcon id={player.token} size="68%" />
    </span>
  );
}

const sq = { width: '100%', height: '100%', viewBox: '0 0 24 24', 'aria-hidden': true } as const;

export const PlaneIcon = () => (
  <svg {...sq} fill="currentColor">
    <path d="M21 15.6V14l-7.5-4.6V4.1a1.5 1.5 0 0 0-3 0v5.3L3 14v1.6l7.5-2.3v5.2l-2 1.5v1.5l3.5-1 3.5 1V20l-2-1.5v-5.2Z" />
  </svg>
);
export const BoltIcon = () => (
  <svg {...sq} fill="currentColor">
    <path d="M13.2 2 4.6 13.4h6.3L9.9 22l9.5-12.2h-6.5Z" />
  </svg>
);
export const DropIcon = () => (
  <svg {...sq} fill="currentColor">
    <path d="M12 2.8S5.6 10 5.6 14.5a6.4 6.4 0 0 0 12.8 0C18.4 10 12 2.8 12 2.8Z" />
  </svg>
);
export const EnvelopeIcon = () => (
  <svg {...sq}>
    <rect x="4.5" y="2.5" width="15" height="19" rx="1.6" fill="currentColor" />
    <path d="M4.6 4.2c2.2 3.4 4.6 5 7.4 5s5.2-1.6 7.4-5" fill="none" stroke="var(--gold)" strokeWidth="1.1" />
    <circle cx="12" cy="10" r="2.3" fill="var(--gold)" />
  </svg>
);
export const ArrowIcon = () => (
  <svg {...sq} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12H5M11 5.5 4.5 12 11 18.5" />
  </svg>
);
export const BarsIcon = () => (
  <svg {...sq} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
    <path d="M8.5 3.5v17M12 3.5v17M15.5 3.5v17" />
  </svg>
);
export const LockIcon = () => (
  <svg {...sq} fill="currentColor">
    <path d="M7.5 10V7.6a4.5 4.5 0 0 1 9 0V10h-2V7.6a2.5 2.5 0 0 0-5 0V10Z" />
    <rect x="5" y="10" width="14" height="11" rx="2" />
  </svg>
);
export const CoinIcon = () => (
  <svg {...sq}>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <text x="12" y="16.4" textAnchor="middle" fontSize="12.5" fontFamily="var(--font-display)" fill="currentColor">₫</text>
  </svg>
);
export const ParkIcon = () => (
  <svg {...sq}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="var(--font-body)" fill="currentColor">P</text>
  </svg>
);
