import React from 'react';
import { useListGenerations } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Loader2, Music, Clock, Type, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function History() {
  const daysRemaining = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const remaining = 7 - Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  };

  const { data: generations, isLoading, isError, refetch } = useListGenerations({
    query: { retry: 2 }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">تعذّر تحميل السجل</h2>
        <p className="text-muted-foreground text-sm">تأكد من اتصالك بالإنترنت وأعد المحاولة.</p>
        <Button variant="outline" onClick={() => refetch()}>إعادة المحاولة</Button>
      </div>
    );
  }

  if (!generations || generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <Music className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">لا يوجد سجل توليد</h2>
        <p className="text-muted-foreground">لم تقم بتوليد أي مقاطع صوتية حتى الآن.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">مكتمل</Badge>;
      case 'pending':
      case 'processing':
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">قيد المعالجة</Badge>;
      case 'failed':
        return <Badge variant="destructive">فشل</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">سجل التوليد</h1>
        <p className="text-muted-foreground">تصفح واستمع إلى المقاطع الصوتية التي قمت بتوليدها مسبقاً.</p>
      </div>

      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 px-4 py-3 rounded-xl mb-6">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span className="text-sm">
          كل تسجيل صوتي يُحذف تلقائيًا وبشكل نهائي بعد 7 أيام من إنشائه. 
          حمّل الملفات المهمة قبل انتهاء المدة.
        </span>
      </div>

      <div className="grid gap-4">
        {generations.map((gen) => (
          <div key={gen.id} className="bg-card border border-border p-5 rounded-2xl shadow-sm flex flex-col gap-4 transition-all hover:shadow-md">
            
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span dir="ltr">{format(new Date(gen.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}</span>
                </div>
                {daysRemaining(gen.created_at) <= 2 ? (
                  <span className="text-xs px-2 py-1 rounded-md bg-destructive/10 text-destructive font-medium">
                    يُحذف خلال {daysRemaining(gen.created_at)} يوم
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                    متبقي {daysRemaining(gen.created_at)} أيام
                  </span>
                )}
                {gen.character_count != null && (
                  <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg">
                    <Type className="w-4 h-4" />
                    <span>{gen.character_count} حرف</span>
                  </div>
                )}
                {getStatusBadge(gen.status)}
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 border border-border/50 text-foreground leading-relaxed line-clamp-3">
              {gen.text_input || "النص غير متوفر"}
            </div>

            {gen.status === 'completed' && gen.audio_url && (
              <div className="mt-2 w-full max-w-md">
                <audio controls src={gen.audio_url} className="w-full h-10" />
              </div>
            )}

            {gen.status === 'failed' && (
              <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                <AlertCircle className="w-4 h-4" />
                <span>فشل توليد هذا المقطع. لم يتم خصم الحروف من رصيدك.</span>
              </div>
            )}
            
          </div>
        ))}
      </div>
    </div>
  );
}
