export type PixelIconName = 'game' | 'star' | 'code' | 'rocket' | 'heart' | 'expand' | 'arrow'
const paths: Record<PixelIconName, string> = {
  game: 'M4 5h8v1h2v2h1v5h-3v-2H4v2H1V8h1V6h2V5zm0 3v1H3v1h1v1h1v-1h1V9H5V8H4zm6 0v1h1V8h-1zm2 2v1h1v-1h-1z',
  star: 'M7 1h2v4h4v2h2v2h-4v5H9v-2H7v2H5V9H1V7h2V5h4V1z',
  code: 'M4 3h2v2H4v2H2v2h2v2h2v2H4v-2H2V9H0V7h2V5h2V3zm6 0h2v2h2v2h2v2h-2v2h-2v2h-2v-2h2V9h2V7h-2V5h-2V3z',
  rocket: 'M10 1h5v5h-1v2h-2v3h-2v2H8v-3H6V8H3V6h2V4h3V2h2V1zm0 3v2h2V4h-2zM3 10h2v3H2v2H0v-3h3v-2z',
  heart: 'M2 3h4v2h4V3h4v2h2v5h-2v2h-2v2h-2v2H6v-2H4v-2H2v-2H0V5h2V3z',
  expand: 'M1 1h6v2H3v4H1V1zm8 0h6v6h-2V3H9V1zM1 9h2v4h4v2H1V9zm12 0h2v6H9v-2h4V9z',
  arrow: 'M8 1h2v2h2v2h2v2h2v2h-2v2h-2v2h-2v2H8v-5H0V6h8V1z',
}
export function PixelIcon({ name, className = '' }: { name: PixelIconName; className?: string }) {
  return <svg className={`pixel-icon ${className}`} viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges"><path d={paths[name]} fill="currentColor" /></svg>
}
