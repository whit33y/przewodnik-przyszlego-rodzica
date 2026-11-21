import type { SVGProps } from "react";

/** Own stroke icon set, 24×24 grid, 1.75 stroke — matches the gov.pl mockups. */
const paths = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  "chevron-down": <path d="M5 9l7 7 7-7" />,
  "chevron-up": <path d="M5 15l7-7 7 7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5L2.5 20h19L12 3.5z" />
      <path d="M12 10v4.5M12 17.5h.01" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  "minus-circle": (
    <>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <path d="M8.5 12h7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  document: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h5M10 15.5h5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M15.5 5.2a3.5 3.5 0 010 6.6M18 14.8c1.8.8 3 2.6 3.5 5.2" />
    </>
  ),
  baby: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 11h.01M15 11h.01M9.5 15c1.4 1.2 3.6 1.2 5 0" />
      <path d="M12 3.5c-1.2 1.2-1.2 2.8 0 4" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />,
  upload: <path d="M12 16V5M7 9.5l5-5 5 5M5 19.5h14" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01" />
    </>
  ),
  home: <path d="M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5" />,
  timeline: (
    <>
      <path d="M3.5 6h9M3.5 12h14M3.5 18h7" />
      <circle cx="15.5" cy="6" r="1.5" />
      <circle cx="20" cy="12" r="1.5" />
      <circle cx="13.5" cy="18" r="1.5" />
    </>
  ),
  steps: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4.5 18h1" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  shield: <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6L12 3z" />,
  printer: (
    <>
      <path d="M7 9V3.5h10V9M7 17H4.5v-7.5h15V17H17" />
      <path d="M7 14h10v6.5H7z" />
    </>
  ),
  building: (
    <>
      <path d="M4.5 20.5V5l8-2v17.5M12.5 8h7v12.5" />
      <path d="M7.5 8h2M7.5 11.5h2M7.5 15h2M15.5 11.5h1.5M15.5 15h1.5M3 20.5h18" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="5.5" ry="2.5" />
      <path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" />
      <path d="M9.5 16.2c.9.2 1.9.3 3 .3 3 0 5.5-1.1 5.5-2.5V10M14.5 10.6c2 .2 6 1 6 2.4v4c0 1.4-2.5 2.5-5.5 2.5-2 0-3.8-.5-4.8-1.3" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1.5 1.5 0 01-1.6 1.5A16.5 16.5 0 013.5 5.6 1.5 1.5 0 015 4z" />,
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </>
  ),
  refresh: <path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4.5v4h-4" />,
  sliders: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4" />,
  logout: <path d="M10 4.5H5v15h5M15 8l4 4-4 4M19 12H9.5" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  scale: <path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a2.5 2.5 0 005 0L5 8zM19 8l-2.5 6a2.5 2.5 0 005 0L19 8z" />,
} as const;

export type IconName = keyof typeof paths;
export const iconNames = Object.keys(paths) as IconName[];

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: 16 | 18 | 20 | 24 | 32;
  /** When set, the icon is announced; otherwise it is decorative. */
  label?: string;
}

export function Icon({ name, size = 24, label, style, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
      style={{ flex: "none", ...style }}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
