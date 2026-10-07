import { brandPaths, brandViewBox } from './brand-geometry'

export function Mark({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'brand-mark small' : 'brand-mark'} viewBox={brandViewBox} fill="currentColor" aria-hidden="true">
    {brandPaths.map((path, index) => <path key={index} d={path} />)}
  </svg>
}
