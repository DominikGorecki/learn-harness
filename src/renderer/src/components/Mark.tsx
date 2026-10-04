export function Mark({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'brand-mark small' : 'brand-mark'} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M20 4v32M4 20h32M8.7 8.7l22.6 22.6M8.7 31.3L31.3 8.7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    <circle cx="20" cy="20" r="7" fill="currentColor" />
  </svg>
}
