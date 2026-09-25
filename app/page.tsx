import Image from 'next/image';
import Link from 'next/link';

const steps = [
  'Upload your room once',
  'Choose 1–6 styles',
  'Pin one + compare the rest',
  'Pick a winner + shop it',
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="lux-hero">
        <Image
          src="/roomai-hero.png"
          alt="Warm, modern living room"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1280px"
          className="lux-hero-image"
        />
        <div className="lux-overlay" />

        <div className="lux-copy">
          <span className="lux-logo">
            Room<span>AI</span>
          </span>

          <div className="lux-content">
            <div className="kicker text-white/80">
              AI INTERIOR DESIGN + REAL SHOPPING
            </div>
            <h1>
              <span>Your room.</span>
              <span>Your budget.</span>
              <em>Real products.</em>
            </h1>
            <p>
              Upload once. Compare up to six styles. Pick your favorite, set the
              budget and shop the room.
            </p>
            <div className="lux-actions">
              <Link href="/new-project" className="btn-primary">
                Start designing ✨
              </Link>
              <Link href="/pricing" className="btn-glass">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="kicker">How V6 works</div>
        <h2 className="mt-2 text-3xl font-semibold md:text-5xl">
          Compare before you commit.
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <div className="card p-6" key={step}>
              <div className="text-sm text-stone-500">0{index + 1}</div>
              <h3 className="mt-3 text-xl font-semibold">{step}</h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
