import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(10px,2vw,22px)' }}>
      <section style={{ position: 'relative', height: 'min(79svh,850px)', minHeight: 510, overflow: 'hidden', borderRadius: 24, background: '#241b16' }}>
        {/* The supplied hero artwork already includes its headline and a drawn button.
            Crop the lower artwork so the drawn button is never visible. */}
        <img src="/roomai-hero.png" alt="Elegant living room interior" style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '180%',
          objectFit: 'cover', objectPosition: 'center top'
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 45%,rgba(24,18,15,.18) 65%,rgba(24,18,15,.86) 100%)', pointerEvents: 'none' }} />
        <Link href="/new-project" style={{
          position: 'absolute', bottom: '5%', left: '50%', transform: 'translateX(-50%)',
          display: 'block', boxSizing: 'border-box', width: 'min(88%,370px)',
          padding: '17px 20px', borderRadius: 40, background: '#fff', color: '#17120f',
          fontSize: 18, fontWeight: 700, textAlign: 'center', textDecoration: 'none',
          boxShadow: '0 8px 25px #0006', whiteSpace: 'nowrap'
        }}>Start designing ✨</Link>
      </section>
    </main>
  );
}
