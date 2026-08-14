type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5.5h4V20" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="12" width="3.4" height="7.5" rx="1" />
      <rect x="10.3" y="7" width="3.4" height="12.5" rx="1" />
      <rect x="16.6" y="3.5" width="3.4" height="16" rx="1" />
    </svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 4h2l2.2 11.2a1.5 1.5 0 0 0 1.48 1.3h7.4a1.5 1.5 0 0 0 1.48-1.24L20 8H6.4" />
      <circle cx="9.5" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DumbbellIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 8.5v7" />
      <path d="M6.5 9.5v5" />
      <path d="M17.5 9.5v5" />
      <path d="M20 8.5v7" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M13.5 5.5 18 10l-9.5 9.5H4v-4.5z" />
      <path d="M12 7l4 4" />
    </svg>
  );
}

export function SwitchProfileIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="14" cy="7.2" r="2.6" />
      <path d="M9 19c0-3 2.2-5.2 5-5.2s5 2.2 5 5.2" />
      <path d="M4.6 8.5H1.2" />
      <path d="M3.2 6.3 1.2 8.5l2 2.2" />
      <path d="M23.4 15.5h3.4" />
      <path d="M24.8 13.3l2 2.2-2 2.2" />
    </svg>
  );
}
