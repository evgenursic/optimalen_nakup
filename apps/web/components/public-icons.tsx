import type { ReactNode, SVGProps } from "react";

// Icon path data adapted from lucide-react v1.27.0 (ISC licensed). Keeping these
// public-only icons inline prevents the client icon graph from entering server pages.

type PublicIconName =
  | "arrow-right"
  | "check-circle"
  | "circle-alert"
  | "circle-dashed"
  | "gauge"
  | "languages"
  | "search"
  | "shield-check";

export type PublicIconProps = Omit<SVGProps<SVGSVGElement>, "name" | "strokeWidth"> & {
  size?: number;
  strokeWidth?: number;
};

const paths: Record<PublicIconName, ReactNode> = {
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  "circle-alert": (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </>
  ),
  "circle-dashed": (
    <>
      <path d="M10.1 2.182a10 10 0 0 1 3.8 0" />
      <path d="M13.9 21.818a10 10 0 0 1-3.8 0" />
      <path d="M17.609 3.721a10 10 0 0 1 2.69 2.7" />
      <path d="M2.182 13.9a10 10 0 0 1 0-3.8" />
      <path d="M20.279 17.609a10 10 0 0 1-2.7 2.69" />
      <path d="M21.818 10.1a10 10 0 0 1 0 3.8" />
      <path d="M3.721 6.391a10 10 0 0 1 2.7-2.69" />
      <path d="M6.391 20.279a10 10 0 0 1-2.69-2.7" />
    </>
  ),
  gauge: (
    <>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </>
  ),
  languages: (
    <>
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </>
  ),
  search: (
    <>
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
    </>
  ),
  "shield-check": (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

export function PublicIcon({
  name,
  size = 24,
  strokeWidth = 2,
  ...props
}: PublicIconProps & { name: PublicIconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

export function ArrowRightIcon(props: PublicIconProps) {
  return <PublicIcon name="arrow-right" {...props} />;
}

export function CheckCircleIcon(props: PublicIconProps) {
  return <PublicIcon name="check-circle" {...props} />;
}

export function CircleAlertIcon(props: PublicIconProps) {
  return <PublicIcon name="circle-alert" {...props} />;
}

export function CircleDashedIcon(props: PublicIconProps) {
  return <PublicIcon name="circle-dashed" {...props} />;
}

export function GaugeIcon(props: PublicIconProps) {
  return <PublicIcon name="gauge" {...props} />;
}

export function LanguagesIcon(props: PublicIconProps) {
  return <PublicIcon name="languages" {...props} />;
}

export function SearchIcon(props: PublicIconProps) {
  return <PublicIcon name="search" {...props} />;
}

export function ShieldCheckIcon(props: PublicIconProps) {
  return <PublicIcon name="shield-check" {...props} />;
}
