export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand--compact' : ''}`}>
    <img src="/brand/viber-mascot.png" className="brand__mascot" alt="" width="88" height="88" />
    <div><h1 className="brand__name" aria-label="Viber Lab">VIBER<span>LAB</span></h1><p className="brand__tagline">KLEINE IDEEN. GROSSE SPIELE.</p></div>
  </div>
}
