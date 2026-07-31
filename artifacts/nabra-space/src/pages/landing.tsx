import React, { useRef, useState } from 'react';
import { Link } from 'wouter';
import { PlayCircle, Pause, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, useInView } from 'framer-motion';

/* ───────── Animation helpers ───────── */
function Section({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ───────── Animated SVG Waveform ───────── */
function SoundWave() {
  const bars = 28;
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Glow behind */}
      <div className="absolute inset-0 blur-[80px] opacity-30" style={{ background: 'var(--gradient-signature)' }} />
      <svg viewBox={`0 0 ${bars * 14} 200`} className="w-full h-full max-h-[320px] relative z-10" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#02C2DD" />
            <stop offset="45%" stopColor="#1D62D3" />
            <stop offset="100%" stopColor="#C01CF2" />
          </linearGradient>
        </defs>
        {Array.from({ length: bars }).map((_, i) => {
          const baseHeight = 20 + Math.sin((i / bars) * Math.PI) * 70 + Math.sin((i / bars) * Math.PI * 3) * 25;
          return (
            <motion.rect
              key={i}
              x={i * 14 + 2}
              width="8"
              rx="4"
              fill="url(#waveGrad)"
              initial={{ height: baseHeight, y: 100 - baseHeight / 2 }}
              animate={{
                height: [baseHeight, baseHeight * 0.4, baseHeight * 1.1, baseHeight * 0.6, baseHeight],
                y: [100 - baseHeight / 2, 100 - (baseHeight * 0.4) / 2, 100 - (baseHeight * 1.1) / 2, 100 - (baseHeight * 0.6) / 2, 100 - baseHeight / 2],
              }}
              transition={{
                duration: 2.8 + Math.random() * 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: (i / bars) * 0.8,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ───────── Plans data (from pricing) ───────── */
const PLANS = [
  {
    id: 'starter',
    name: 'الانطلاقة',
    price: 1.0,
    characters: 6_000,
    features: ['جودة صوت استوديو احترافية', 'جميع النبرات متاحة', 'تحميل بصيغة MP3'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'المحترف',
    price: 5.0,
    characters: 40_000,
    features: ['جودة صوت استوديو احترافية', 'جميع النبرات متاحة', 'تحميل بصيغة MP3 و WAV', 'أولوية في الدعم الفني'],
    popular: true,
  },
  {
    id: 'agency',
    name: 'المتجر / الوكالة',
    price: 10.0,
    characters: 100_000,
    features: ['كل ميزات باقة المحترف', 'مدير حساب مخصص', 'استخدام تجاري غير محدود', 'API قريباً'],
    popular: false,
  },
];

/* ═══════════════════════════════════════════════ */
export default function Landing() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary overflow-hidden" style={{ fontFamily: "var(--app-font-body)" }}>
      <audio ref={audioRef} src="/sample-1.wav" onEnded={() => setIsPlaying(false)} />

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/40 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="Nabra Space" className="h-9 w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">كيف يعمل </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">الأسعار</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" data-testid="link-login-ghost">
              <Button variant="ghost" className="font-bold hidden sm:inline-flex">تسجيل الدخول</Button>
            </Link>
            <Link href="/login" data-testid="link-login-cta">
              <button
                className="gradient-bg text-white font-bold px-6 py-2.5 rounded-full text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
              >
                جرّب مجانًا
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO (Asymmetric) ═══ */}
      <section className="relative pt-36 pb-24 md:pt-48 md:pb-40 overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full blur-[160px] opacity-15 -z-10" style={{ background: '#02C2DD' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-10 -z-10" style={{ background: '#C01CF2' }} />

        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Text Side (RIGHT in RTL) */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="order-1"
            >
              <span className="inline-block text-sm font-bold mb-4 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10" style={{ color: 'hsl(288 88% 53%)' }}>
                لأول مرة في الجزائر
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.15] mb-6 tracking-tight" style={{ fontFamily: "var(--app-font-heading)" }}>
                أعطي لإعلانك نبرة{' '}
                <span className="gradient-text">جزائرية حقيقية</span>،{' '}
                <br className="hidden sm:block" />
                بضغطة زر.
              </h1>


              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl" style={{ fontFamily: "var(--app-font-body)" }}>
                من سكريبت لصوت بشري جزائري أصيل، بكل نبرة وعاطفة يحتاجها براندك — بلا استوديو، بلا مؤثر صوتي، بلا انتظار.              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <button
                    className="gradient-bg text-white font-bold px-8 py-4 rounded-2xl text-lg shadow-lg hover:shadow-[0_0_30px_rgba(2,194,221,0.35)] transition-all duration-300 flex items-center gap-3 group"
                  >
                    جرّب مجانًا الآن
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </button>
                </Link>
                <button
                  onClick={() => {
                    if (isPlaying) {
                      audioRef.current?.pause();
                      setIsPlaying(false);
                    } else {
                      audioRef.current?.play();
                      setIsPlaying(true);
                    }
                  }}
                  className="font-bold px-8 py-4 rounded-2xl text-lg border border-border/60 text-foreground bg-transparent hover:bg-white/5 transition-colors flex items-center gap-3"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-primary" />
                  ) : (
                    <PlayCircle className="w-6 h-6 text-primary" />
                  )}
                  استمع لعينة
                </button>
              </div>
            </motion.div>

            {/* Waveform Side (LEFT in RTL) */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              className="order-2 h-[260px] sm:h-[320px] lg:h-[400px]"
            >
              <SoundWave />
            </motion.div>
          </div>
        </div>
      </section>


      {/* ═══ HOW IT WORKS ═══ */}
      <Section className="py-[120px] lg:py-[160px]" delay={0}>
        <div id="how-it-works" className="max-w-7xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-20"
            style={{ fontFamily: "var(--app-font-heading)" }}
          >
            من الفكرة للصوت، بثلاث خطوات
          </motion.h2>

          <div className="grid lg:grid-cols-[1fr_auto] gap-12 lg:gap-16 items-start">
            {/* Browser Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="bg-card rounded-2xl border border-border/60 shadow-2xl shadow-black/40 overflow-hidden">
                {/* Browser bar */}
                <div className="h-11 bg-[hsl(240,30%,10%)] border-b border-border/40 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  <div className="flex-1 mx-8">
                    <div className="bg-background/40 rounded-lg h-6 max-w-xs mx-auto flex items-center justify-center">
                      <span className="text-[11px] text-muted-foreground/60 font-mono" dir="ltr">nabra.space/generate</span>
                    </div>
                  </div>
                </div>

                {/* Mockup content — simplified generate UI */}
                <div className="p-6 md:p-8 space-y-5">
                  {/* Block 1 */}
                  <div className="flex gap-4">
                    <span className="bg-primary/15 text-primary font-bold w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm" style={{ fontFamily: "var(--app-font-numbers)" }}>1</span>
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2 items-center">
                        <div className="bg-background/60 border border-border/40 rounded-xl px-3 py-1.5 text-xs text-muted-foreground">هادئ</div>
                        <div className="bg-background/60 border border-border/40 rounded-xl px-3 py-1.5 text-xs text-muted-foreground opacity-50">متحمس</div>
                        <div className="bg-background/60 border border-border/40 rounded-xl px-3 py-1.5 text-xs text-muted-foreground opacity-50">ودود</div>
                      </div>
                      <div className="h-20 bg-background/30 rounded-xl border border-border/30 p-3">
                        <p className="text-sm text-muted-foreground/80 leading-relaxed">مرحبا بيكم في عالم نبرة، وين الذكاء الاصطناعي يهدر بالدارجة...</p>
                      </div>
                    </div>
                  </div>
                  {/* Block 2 */}
                  <div className="flex gap-4">
                    <span className="bg-accent/15 text-accent font-bold w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm" style={{ fontFamily: "var(--app-font-numbers)" }}>2</span>
                    <div className="flex-1">
                      <div className="h-16 bg-background/30 rounded-xl border border-border/30 p-3">
                        <p className="text-sm text-muted-foreground/60 leading-relaxed">اكتب النص هنا...</p>
                      </div>
                    </div>
                  </div>
                  {/* Generate button mockup */}
                  <div className="flex justify-start pt-2">
                    <div className="gradient-bg text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 opacity-90">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                      توليد الصوت
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Steps labels — staggered vertically */}
            <div className="flex flex-row lg:flex-col gap-6 lg:gap-10 lg:pt-16">
              {[
                { num: '١', text: 'اختار النبرة', color: 'text-primary' },
                { num: '٢', text: 'اكتب نصك', color: 'text-[#1D62D3]' },
                { num: '٣', text: 'استمع فورًا', color: 'text-accent' },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                  className="flex items-center gap-4"
                >
                  <span className={`text-3xl lg:text-4xl font-extrabold ${step.color}`} style={{ fontFamily: "var(--app-font-heading)" }}>
                    {step.num}
                  </span>
                  <span className="text-lg lg:text-xl font-bold text-foreground" style={{ fontFamily: "var(--app-font-heading)" }}>
                    {step.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Section>


      {/* ═══ AUTHENTICITY / TRUST ═══ */}
      <Section className="py-[120px] lg:py-[160px]" delay={0.1}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-8" style={{ fontFamily: "var(--app-font-heading)" }}>
            دارجة حقيقية <span className="gradient-text">100%</span>.{' '}
            <br className="hidden md:block" />
تسمعها، تحسها، وتفهمها.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto" style={{ fontFamily: "var(--app-font-body)" }}>
ماشي مجرد ذكاء اصطناعي يقرأ نصوص. Nabra Space مبنية خصيصاً باش تعبر بالنبرة والإيقاع الجزائري الأصلي — كلام نقي، طبيعي، وبلا تصنع.          </p>
        </div>
      </Section>


      {/* ═══ PRICING PREVIEW ═══ */}
      <Section className="py-[120px] lg:py-[160px]" delay={0}>
        <div id="pricing" className="max-w-6xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-center mb-6"
            style={{ fontFamily: "var(--app-font-heading)" }}
          >
            أسعار بسيطة، بدون مفاجآت
          </motion.h2>
          <p className="text-lg text-muted-foreground text-center mb-16 max-w-xl mx-auto" style={{ fontFamily: "var(--app-font-body)" }}>
            اختر الباقة التي تناسب حجم أعمالك. الدفع لمرة واحدة.
          </p>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className={`relative bg-card rounded-2xl p-7 lg:p-8 transition-all duration-300 hover:translate-y-[-4px] ${plan.popular
                  ? 'gradient-border shadow-xl shadow-primary/10 scale-[1.03] z-10'
                  : 'border border-border/60 shadow-lg shadow-black/20'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 gradient-bg text-white px-4 py-1 rounded-full text-xs font-bold shadow-md">
                    الأكثر طلباً
                  </div>
                )}

                <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--app-font-heading)" }}>{plan.name}</h3>

                <div className="mb-5 flex items-baseline gap-1">
                  <span className="text-4xl lg:text-5xl font-extrabold" dir="ltr" style={{ fontFamily: "var(--app-font-numbers)" }}>
                    ${plan.price.toFixed(2)}
                  </span>
                </div>

                <div className="bg-background/40 rounded-xl p-3.5 mb-6 text-center border border-border/30">
                  <div className="text-2xl font-bold text-primary mb-0.5" style={{ fontFamily: "var(--app-font-numbers)" }}>
                    {plan.characters.toLocaleString()}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">حرف (صالح مدى الحياة)</div>
                </div>

                <ul className="space-y-3 mb-7">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <div className="bg-primary/10 p-0.5 rounded-full shrink-0">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/login">
                  <button
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${plan.popular
                      ? 'gradient-bg text-white shadow-lg hover:shadow-primary/30'
                      : 'bg-transparent border border-border/60 text-foreground hover:bg-white/5'
                      }`}
                    data-testid={`landing-subscribe-${plan.id}`}
                  >
                    شراء الآن
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/login" className="text-primary hover:text-primary/80 font-bold text-sm transition-colors">
              شاهد كل التفاصيل ←
            </Link>
          </div>
        </div>
      </Section>


      {/* ═══ FOOTER CTA ═══ */}
      <Section className="py-[120px] lg:py-[160px] relative overflow-hidden" delay={0.1}>
        {/* Background accents */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full blur-[180px] opacity-10 -z-10" style={{ background: 'var(--gradient-signature)' }} />

        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 leading-tight" style={{ fontFamily: "var(--app-font-heading)" }}>
            صوتك الجزائري الأصيل{' '}
            <span className="gradient-text">يبدأ من هنا</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto" style={{ fontFamily: "var(--app-font-body)" }}>
            انضم إلى صناع المحتوى والبراندات التي تثق بـ Nabra Space.
          </p>
          <Link href="/login">
            <button
              className="gradient-bg text-white font-bold px-10 py-5 rounded-2xl text-lg shadow-xl hover:shadow-[0_0_40px_rgba(2,194,221,0.3)] transition-all duration-300 inline-flex items-center gap-3 group"
            >
              جرّب مجانًا الآن
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </Section>


      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border/40 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-70">
            <img src="/logo.png" alt="Nabra Space" className="h-7 w-auto" />
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Nabra Space. جميع الحقوق محفوظة.
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">شروط الاستخدام</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">سياسة الخصوصية</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
