import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGetAffiliateStats, useRedeemPromoCode } from '@workspace/api-client-react';
import { Copy, Gift, Link as LinkIcon, MousePointerClick, UserPlus, DollarSign, Wallet, Clock, Check, Loader2, Sparkles, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Gifts() {
  const { profile, refreshProfile } = useAuth();
  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats, refetch } = useGetAffiliateStats({
    query: { retry: 2 }
  });
  const redeemCode = useRedeemPromoCode();
  
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const referralLink = stats?.referral_code 
    ? `${window.location.origin}/?ref=${stats.referral_code}`
    : '';

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('تم نسخ الرابط بنجاح!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    redeemCode.mutate(
      { data: { code: code.trim() } },
      {
        onSuccess: (res) => {
          toast.success(`مبارك! تمت إضافة ${res.characters_granted.toLocaleString()} حرف لرصيدك!`);
          setCode('');
          refreshProfile();
        },
        onError: (err: any) => {
          toast.error(err?.data?.error || 'رمز غير صالح أو منتهي الصلاحية');
        }
      }
    );
  };

  if (isLoadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isErrorStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">تعذّر تحميل بيانات الإحالة</h2>
        <p className="text-muted-foreground text-sm">تأكد من اتصالك بالإنترنت وأعد المحاولة.</p>
        <Button variant="outline" onClick={() => refetch()}>إعادة المحاولة</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-12">
      
      {/* HEADER */}
      <div className="text-center md:text-right">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center justify-center md:justify-start gap-3">
          <Gift className="w-8 h-8 text-primary" />
          برنامج الهدايا والإحالات
        </h1>
        <p className="text-lg text-muted-foreground">شارك Nabra Space مع أصدقائك واكسب رصيداً إضافياً أو عمولات نقدية.</p>
      </div>

      {/* REFERRAL LINK SECTION */}
      <div className="bg-card border-2 border-primary/20 rounded-3xl p-8 md:p-10 shadow-xl shadow-primary/5 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">رابط الإحالة الخاص بك</h2>
              <p className="text-muted-foreground mb-2">انسخ هذا الرابط وشاركه. ستحصل على عمولة <strong>{stats?.commission_rate || 15}%</strong> عن كل عملية شراء يقوم بها من يسجل عبر رابطك.</p>
              
              {/* 12-month commission rule notice */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-xl px-4 py-3 mb-6">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>تكسب عمولة من كل شخص أحلته لمدة <strong>12 شهراً</strong> من تاريخ انضمامه فقط. بعد ذلك تنتهي نافذة العمولة، لكن إحصائياتك تبقى محفوظة.</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <LinkIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <Input 
                    readOnly 
                    value={referralLink} 
                    dir="ltr"
                    className="w-full pl-4 pr-12 py-6 text-left font-mono bg-background border-2 border-border focus-visible:ring-0 focus-visible:border-primary text-base md:text-lg rounded-xl"
                  />
                </div>
                <Button 
                  onClick={handleCopy} 
                  size="lg" 
                  className={`py-6 px-8 rounded-xl font-bold gap-2 ${copied ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'تم النسخ' : 'نسخ الرابط'}
                </Button>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6 rounded-2xl md:w-64 text-center shrink-0">
              <div className="text-sm font-medium text-primary mb-1">نسبة العمولة الخاصة بك</div>
              <div className="text-5xl font-black text-primary" dir="ltr">{stats?.commission_rate || 15}%</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-background border border-border p-5 rounded-2xl flex flex-col items-center justify-center text-center">
              <MousePointerClick className="w-6 h-6 text-muted-foreground mb-2" />
              <div className="text-2xl font-bold">{stats?.total_clicks || 0}</div>
              <div className="text-xs text-muted-foreground">الزيارات</div>
            </div>
            <div className="bg-background border border-border p-5 rounded-2xl flex flex-col items-center justify-center text-center">
              <UserPlus className="w-6 h-6 text-muted-foreground mb-2" />
              <div className="text-2xl font-bold">{stats?.total_signups || 0}</div>
              <div className="text-xs text-muted-foreground">التسجيلات</div>
            </div>
            <div className="bg-background border border-border p-5 rounded-2xl flex flex-col items-center justify-center text-center">
              <DollarSign className="w-6 h-6 text-emerald-500 mb-2" />
              <div className="text-2xl font-bold text-emerald-600">{stats?.total_conversions || 0}</div>
              <div className="text-xs text-muted-foreground">المشتريات</div>
            </div>
            
            <div className="bg-amber-50/50 border border-amber-200 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative group">
              <Clock className="w-6 h-6 text-amber-500 mb-2" />
              <div className="text-2xl font-bold text-amber-600" dir="ltr">${stats?.pending_balance?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-amber-700 font-medium">رصيد معلّق</div>
              <div className="absolute inset-x-0 -top-12 bg-black text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                10 أيام انتظار قبل أن يصبح متاحاً
              </div>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
              <Wallet className="w-6 h-6 text-primary mb-2" />
              <div className="text-2xl font-bold text-primary" dir="ltr">${stats?.available_balance?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-primary font-medium">متاح للسحب</div>
            </div>
          </div>
        </div>
      </div>

      {/* PROMO CODE SECTION */}
      <div className="bg-card border border-border rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles className="w-10 h-10 text-accent" />
          </div>
          
          <div className="flex-1 text-center md:text-right">
            <h2 className="text-2xl font-bold mb-2">هل لديك كود هدية؟</h2>
            <p className="text-muted-foreground mb-6">أدخل الكود الترويجي الخاص بك هنا للحصول على حروف مجانية لرصيدك فوراً.</p>
            
            <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <Input 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="أدخل الكود هنا (مثال: FREE5000)"
                dir="ltr"
                className="flex-1 py-6 text-center md:text-left font-mono font-bold tracking-widest text-lg bg-background rounded-xl uppercase"
                disabled={redeemCode.isPending}
              />
              <Button 
                type="submit" 
                size="lg" 
                className="py-6 px-10 rounded-xl font-bold text-lg bg-foreground text-background hover:bg-foreground/90"
                disabled={!code.trim() || redeemCode.isPending}
                data-testid="button-redeem-code"
              >
                {redeemCode.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'استبدال الكود'}
              </Button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
