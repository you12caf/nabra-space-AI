import React from 'react';
import { Link } from 'wouter';
import { Mic2, PlayCircle, Sparkles, Zap, Globe, Shield, Waves, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary overflow-hidden font-sans">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Mic2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Nabra Space</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">المميزات</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">كيف تعمل؟</a>
            <a href="#samples" className="hover:text-foreground transition-colors">عينات صوتية</a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" data-testid="link-login-ghost">
              <Button variant="ghost" className="font-bold hidden sm:inline-flex">تسجيل الدخول</Button>
            </Link>
            <Link href="/login" data-testid="link-login-cta">
              <Button className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">ابدأ مجاناً الآن</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            المنصة الأولى المخصصة للّهجة الجزائرية
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-8 tracking-tight">
            ولّد أصواتاً بشرية <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-blue-400">تنطق بالجزائرية</span> بضغطة زر
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            استوديو تسجيل متكامل مدعوم بالذكاء الاصطناعي، يمنح محتواك نبرة جزائرية أصيلة، واثقة، وجاهزة للبث فوراً.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto px-8 py-7 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 gap-3 group">
                ادخل إلى الاستوديو
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-7 rounded-2xl text-lg font-bold gap-3 bg-white/50 backdrop-blur-sm border-2">
              <PlayCircle className="w-6 h-6 text-primary" />
              استمع للعينة
            </Button>
          </div>
        </div>

        {/* MOCKUP UI */}
        <div className="max-w-5xl mx-auto px-6 mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-20" />
          <div className="bg-card rounded-t-3xl border border-border border-b-0 shadow-2xl overflow-hidden relative z-10 transform perspective-1000 rotate-x-12 translate-y-8 scale-95">
            <div className="h-12 bg-muted/50 border-b border-border flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="p-8">
              <div className="flex gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="flex-1 space-y-4">
                  <div className="w-32 h-10 bg-muted rounded-xl" />
                  <div className="h-32 bg-muted/50 rounded-2xl border border-border/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-muted/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">لماذا Nabra Space؟</h2>
            <p className="text-lg text-muted-foreground">صُمم خصيصاً ليمنحك جودة الاستوديو بدون تعقيداته.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 group">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">لهجة جزائرية أصيلة</h3>
              <p className="text-muted-foreground leading-relaxed">
                ليس مجرد نطق عربي فصحى، بل إيقاع ونبرة وروح جزائرية حقيقية يفهمها جمهورك وتلامس قلوبهم.
              </p>
            </div>
            <div className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 group">
              <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Waves className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">نبرات متعددة للموقف</h3>
              <p className="text-muted-foreground leading-relaxed">
                هادئ، جاد، متحمس، أو ودود. تحكم في المشاعر التي يوصلها صوتك ليتناسب مع نوع المحتوى تماماً.
              </p>
            </div>
            <div className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 group">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">توليد فوري بجودة احترافية</h3>
              <p className="text-muted-foreground leading-relaxed">
                لا مزيد من الانتظار أو حجز الاستوديوهات. اكتب النص واحصل على ملفك الصوتي جاهزاً في ثوانٍ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-8">خطوات بسيطة لصوت احترافي</h2>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-primary/30">1</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">اكتب أو الصق النص</h4>
                    <p className="text-muted-foreground">أدخل النص الذي تريده واجعله مقسماً لمقاطع لتتحكم في كل جزء على حدة.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-primary/30">2</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">اختر النبرة المناسبة</h4>
                    <p className="text-muted-foreground">حدد الإحساس المطلوب لكل مقطع (حماس للتشويق، جدي للمعلومات، هادئ للسرد).</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-primary/30">3</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">اضغط توليد وحمّل</h4>
                    <p className="text-muted-foreground">سيقوم الذكاء الاصطناعي بدمج المقاطع بنعومة ليعطيك ملفاً جاهزاً للاستخدام فوراً.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 rounded-[3rem] transform rotate-3" />
              <img 
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop" 
                alt="Studio Microphone" 
                className="relative z-10 rounded-[3rem] shadow-2xl object-cover h-[500px] w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 bg-foreground text-background text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]" />
        
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <Shield className="w-16 h-16 text-primary mx-auto mb-8 opacity-80" />
          <h2 className="text-4xl md:text-5xl font-black mb-6">جاهز للارتقاء بمحتواك؟</h2>
          <p className="text-xl text-background/70 mb-10">
            انضم إلى صناع المحتوى والمتاجر التي تثق بـ Nabra Space في إنتاج آلاف المقاطع يومياً.
          </p>
          <Link href="/login">
            <Button size="lg" className="px-12 py-8 rounded-full text-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_40px_rgba(29,78,216,0.5)]">
              ابدأ تجربتك الآن
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-muted py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-80">
            <Mic2 className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight">Nabra Space</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Nabra Space. جميع الحقوق محفوظة.
          </div>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground">شروط الاستخدام</a>
            <a href="#" className="text-muted-foreground hover:text-foreground">سياسة الخصوصية</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
