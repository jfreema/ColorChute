/** The parachute: a four-color canopy with a paratrooper hanging under it. Same drawing as public/favicon.svg. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <clipPath id="cc-canopy">
          <path d="M5 29 C5 13 17 3 32 3 C47 3 59 13 59 29 Q52.3 23 45.5 29 Q38.8 23 32 29 Q25.3 23 18.5 29 Q11.8 23 5 29 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#cc-canopy)">
        <path d="M32 -6 L-40 44 L13 44 Z" fill="#E84040" />
        <path d="M32 -6 L13 44 L32 44 Z" fill="#FAD945" />
        <path d="M32 -6 L32 44 L51 44 Z" fill="#52C96E" />
        <path d="M32 -6 L51 44 L104 44 Z" fill="#78B8FA" />
      </g>
      <g fill="none" stroke="#171F3D" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 3 Q21 12 18.5 29 M32 3 V29 M32 3 Q43 12 45.5 29" strokeWidth="2.4" />
        <path
          d="M5 29 C5 13 17 3 32 3 C47 3 59 13 59 29 Q52.3 23 45.5 29 Q38.8 23 32 29 Q25.3 23 18.5 29 Q11.8 23 5 29 Z"
          strokeWidth="3"
        />
        <path d="M6 30 L28.5 49 M18.5 29.5 L30 48 M45.5 29.5 L34 48 M58 30 L35.5 49" strokeWidth="1.8" />
      </g>
      <circle cx="32" cy="47" r="3.6" fill="#171F3D" />
      <rect x="28.2" y="51" width="7.6" height="9.5" rx="3" fill="#171F3D" />
    </svg>
  )
}
