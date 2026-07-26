import React from 'react';
import { useCreateCheckout } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Check, Zap, Star, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'starter' as const,
    name: 'الانطلاقة',
    price: 1.00,
    characters: 6000,
    features: ['جودة صوت استوديو احترافية', 'جميع النبرات متاحة', 'تحميل بصيغة MP3'],
    icon: Zap,
    color: 'bg-slate-100 text-slate-700',
    popular: false,
    value: false,
  },
  {
    id: 'pro' as const,
    name: 'المحترف',
    price: 5.00,
    characters: 40000,
    features: ['جودة صوت استوديو احترافية', 'جميع النبرات متاحة', 'تحميل بصيغة MP3 و WAV', 'أولوية في الدعم الفني'],
    icon: Star,
    color: 'bg-primary/10 text-primary',
    popular: true,
    value: false,
  },
  {
    id: 'agency' as const,
    name: 'المتجر / الوكالة',
    price: 10.00,
    characters: 100000,
    features: ['كل ميزات باقة المحترف', 'مدير حساب مخصص', 'استخدام تجاري غير محدود', 'API قريباً'],
    icon: Shield,
    color: 'bg-amber-100 text-amber-700',
    popular: false,
    value: true,
  }
];

export default function Pricing() {
  const createCheckout = useCreateCheckout();

  const handleSubscribe = (packageId: 'starter'|'pro'|'agency') => {
    createCheckout.mutate(
      { data: { package_id: packageId } },
      {
        onSuccess: (res) => {
          if (res.url) {
            window.location.href = res.url;
          } else {
            toast.error('لم يتم إرجاع رابط الدفع. حاول مرة أخرى.');
          }
        },
        onError: (err: any) => {
          toast.error(err?.data?.error || 'فشل إنشاء جلسة الدفع');
        }
      }
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 pt-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">أسعار بسيطة، بدون مفاجآت</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          اختر الباقة التي تناسب حجم أعمالك. الدفع لمرة واحدة، لا يوجد اشتراك شهري يجدد تلقائياً.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {PLANS.map((plan) => {
          const isPending = createCheckout.isPending && createCheckout.variables?.data?.package_id === plan.id;
          
          return (
            <div 
              key={plan.id}
              className={`relative bg-card rounded-3xl p-8 border-2 transition-all duration-300 hover:shadow-xl ${plan.popular ? 'border-primary shadow-primary/10 scale-105 z-10' : 'border-border shadow-sm'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold shadow-md">
                  الأكثر طلباً
                </div>
              )}
              {plan.value && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                  أفضل قيمة
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${plan.color}`}>
                <plan.icon className="w-7 h-7" />
              </div>

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6 flex items-baseline gap-1 text-foreground">
                <span className="text-5xl font-extrabold" dir="ltr">${plan.price.toFixed(2)}</span>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 mb-8 text-center border border-border/50">
                <div className="text-3xl font-bold text-accent mb-1">{plan.characters.toLocaleString()}</div>
                <div className="text-sm font-medium text-muted-foreground">حرف (صالح مدى الحياة)</div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <div className="bg-primary/10 p-1 rounded-full shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Button 
                size="lg" 
                className={`w-full py-6 text-lg font-bold rounded-xl ${plan.popular ? '' : 'variant-outline'}`}
                variant={plan.popular ? 'default' : 'outline'}
                onClick={() => handleSubscribe(plan.id)}
                disabled={createCheckout.isPending}
                data-testid={`button-subscribe-${plan.id}`}
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'شراء الآن'
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
