// Bộ biểu tượng hai tông (duotone) cùng ngôn ngữ với EduFind: nền màu nhạt (--ic2) + nét currentColor, lưới 32, bo tròn.
const G = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I: Record<string, [string, string]> = {
  search: ['<circle cx="14" cy="14" r="9"/>', '<circle cx="14" cy="14" r="9"/><path d="M21 21l7 7"/>'],
  discipline: ['<path d="M5 9l11-5 11 5-11 5z"/>', '<path d="M5 9l11-5 11 5-11 5z"/><path d="M9 12v7c3 3 11 3 14 0v-7"/><path d="M27 9v8"/>'],
  building: ['<rect x="6" y="9" width="20" height="18" rx="2"/>', '<rect x="6" y="9" width="20" height="18" rx="2"/><path d="M16 4v5M11 14h2M19 14h2M11 19h2M19 19h2M14 27v-4h4v4"/>'],
  filter: ['<path d="M4 7h24l-9 11v8l-6-3v-5z"/>', '<path d="M4 7h24l-9 11v8l-6-3v-5z"/>'],
  sort: ['<rect x="5" y="5" width="22" height="22" rx="5"/>', '<path d="M11 8v16M11 24l-4-4M11 24l4-4M21 24V8M21 8l-4 4M21 8l4 4"/>'],
  trophy: ['<path d="M9 5h14v8a7 7 0 0 1-14 0z"/>', '<path d="M9 5h14v8a7 7 0 0 1-14 0z"/><path d="M9 8H5v2a4 4 0 0 0 4 4M23 8h4v2a4 4 0 0 1-4 4M16 20v5M11 27h10"/>'],
  book: ['<path d="M5 7c4-2 8-2 11 1v18c-3-3-7-3-11-1z"/>', '<path d="M5 7c4-2 8-2 11 1v18c-3-3-7-3-11-1zM27 7c-4-2-8-2-11 1v18c3-3 7-3 11-1z"/>'],
  user: ['<circle cx="16" cy="11" r="6"/>', '<circle cx="16" cy="11" r="6"/><path d="M5 28c1-6 5-9 11-9s10 3 11 9"/>'],
  chart: ['<rect x="5" y="5" width="22" height="22" rx="4"/>', '<path d="M6 26h20M10 22v-6M16 22V9M22 22v-9"/>'],
  link: ['<rect x="6" y="6" width="20" height="20" rx="5"/>', '<path d="M13 19l6-6M14 9l2-2a5 5 0 0 1 7 7l-2 2M18 23l-2 2a5 5 0 0 1-7-7l2-2"/>'],
  download: ['<rect x="5" y="19" width="22" height="8" rx="3"/>', '<path d="M16 5v14M10 14l6 6 6-6M6 24v3h20v-3"/>'],
  info: ['<circle cx="16" cy="16" r="12"/>', '<circle cx="16" cy="16" r="12"/><path d="M16 15v7M16 10.5v.5"/>'],
  check: ['<circle cx="16" cy="16" r="12"/>', '<circle cx="16" cy="16" r="12"/><path d="M10.5 16.5l4 4 7-8"/>'],
  shield: ['<path d="M16 4l10 4v8c0 6-4 10-10 12C10 26 6 22 6 16V8z"/>', '<path d="M16 4l10 4v8c0 6-4 10-10 12C10 26 6 22 6 16V8z"/><path d="M11.5 16l3.5 3.5 6-7"/>'],
  sun: ['<circle cx="16" cy="16" r="6"/>', '<circle cx="16" cy="16" r="6"/><path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2.1 2.1M23.1 23.1l2.1 2.1M25.2 6.8l-2.1 2.1M8.9 23.1l-2.1 2.1"/>'],
  moon: ['<path d="M25 19a10 10 0 0 1-12-12 10 10 0 1 0 12 12z"/>', '<path d="M25 19a10 10 0 0 1-12-12 10 10 0 1 0 12 12z"/>'],
  auto: ['<rect x="4" y="6" width="24" height="16" rx="3"/>', '<rect x="4" y="6" width="24" height="16" rx="3"/><path d="M12 27h8M16 22v5"/>'],
  star: ['<path d="M16 4l3.6 7.6 8.4 1-6.2 5.7 1.7 8.2L16 22.3 8.5 26.5l1.7-8.2L4 12.6l8.4-1z"/>', '<path d="M16 4l3.6 7.6 8.4 1-6.2 5.7 1.7 8.2L16 22.3 8.5 26.5l1.7-8.2L4 12.6l8.4-1z"/>'],
  eye: ['<path d="M3 16s5-9 13-9 13 9 13 9-5 9-13 9S3 16 3 16z"/>', '<path d="M3 16s5-9 13-9 13 9 13 9-5 9-13 9S3 16 3 16z"/><circle cx="16" cy="16" r="4"/>'],
  logout: ['<rect x="5" y="5" width="13" height="22" rx="3"/>', '<path d="M18 7h-9a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h9M14 16h14M23 11l5 5-5 5"/>'],
  phone: ['<rect x="9" y="3" width="14" height="26" rx="3"/>', '<rect x="9" y="3" width="14" height="26" rx="3"/><path d="M14 25h4"/>'],
  mail: ['<rect x="4" y="7" width="24" height="18" rx="3"/>', '<rect x="4" y="7" width="24" height="18" rx="3"/><path d="M5 10l11 8 11-8"/>'],
  clock: ['<circle cx="16" cy="16" r="12"/>', '<circle cx="16" cy="16" r="12"/><path d="M16 9v7l5 3"/>'],
  grid: ['<rect x="4" y="4" width="10" height="10" rx="2"/><rect x="18" y="18" width="10" height="10" rx="2"/>', '<rect x="4" y="4" width="10" height="10" rx="2"/><rect x="18" y="4" width="10" height="10" rx="2"/><rect x="4" y="18" width="10" height="10" rx="2"/><rect x="18" y="18" width="10" height="10" rx="2"/>'],
  users: ['<circle cx="12" cy="12" r="5"/>', '<circle cx="12" cy="12" r="5"/><path d="M3 27c0-5 4-8 9-8s9 3 9 8"/><circle cx="23" cy="11" r="3.5"/><path d="M24 18c3 .5 5 3 5 7"/>'],
  external: ['<rect x="5" y="9" width="18" height="18" rx="3"/>', '<path d="M14 18L27 5M19 5h8v8M23 18v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3h6"/>'],
  trash: ['<path d="M8 10h16l-1 17H9z"/>', '<path d="M5 10h22M12 10V6h8v4M9 10l1 17h12l1-17M14 14v9M18 14v9"/>'],
  search2: ['<circle cx="14" cy="14" r="9"/>', '<circle cx="14" cy="14" r="9"/><path d="M21 21l7 7M10 14h8"/>'],
  spark: ['<path d="M16 3l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/>', '<path d="M16 3l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/>'],
};
export type IconName = keyof typeof I;
export function Icon({ n, size = 18, className = "" }: { n: IconName; size?: number; className?: string }) {
  const [a, l] = I[n];
  return (
    <svg className={`ic ${className}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <g fill="var(--ic2,currentColor)" fillOpacity=".28" stroke="none" dangerouslySetInnerHTML={{ __html: a }} />
      <g {...G} dangerouslySetInnerHTML={{ __html: l }} />
    </svg>
  );
}
