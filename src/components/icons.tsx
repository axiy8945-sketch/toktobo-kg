type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IconHome = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base}><path d="M3 13Q12 2.5 21 13v7H3z" /><path d="M10 20v-4a2 2 0 0 1 4 0v4" /></svg>);
export const IconBooks = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>);
export const IconRead = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base}><path d="M3 6c3-1.5 6-1.5 9 .8 3-2.3 6-2.3 9-.8v13c-3-1.5-6-1.5-9 .8-3-2.3-6-2.3-9-.8z" /><path d="M12 7v13" /></svg>);
export const IconCoach = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 5h16v11H9l-5 4z" /><path d="M12 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" /></svg>);
export const IconProg = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>);
export const IconBag = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base}><path d="M4.5 8h15l-1.2 11.2a2 2 0 0 1-2 1.8H7.7a2 2 0 0 1-2-1.8z" /><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" /></svg>);
export const IconMenu = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.2}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const IconX = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.2}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconArrow = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><path d="M4 12h15M14 6l6 6-6 6" /></svg>);
export const IconNE = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><path d="M7 17 17 7M9 7h8v8" /></svg>);
export const IconLeft = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.2}><path d="m15 5-7 7 7 7" /></svg>);
export const IconRight = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.2}><path d="m9 5 7 7-7 7" /></svg>);
export const IconInfo = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></svg>);
export const IconEbook = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base}><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" /></svg>);
export const IconBookmark = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><path d="M6 3h12v18l-6-4-6 4z" /></svg>);
export const IconSend = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><path d="M4 12 20 4l-6 16-3-7z" /></svg>);
export const IconSearch = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>);
export const IconChevron = ({ className }: P) => (<svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.2}><path d="m6 9 6 6 6-6" /></svg>);

export const Mark = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2.6" />
    <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none">
      <path d="M12 18.5Q24 16 36 18.5M10 24h28M12 29.5Q24 32 36 29.5" />
      <path d="M18.5 12Q16 24 18.5 36M24 10v28M29.5 12Q32 24 29.5 36" />
    </g>
  </svg>
);
