import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User, Save } from 'lucide-react';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync input with profile when it loads
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile?.full_name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('الاسم لا يمكن أن يكون فارغاً');
      return;
    }
    setIsSaving(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('غير مسجّل الدخول');

      const res = await fetch(`${API_BASE}/api/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });

      const data = await res.json() as { error?: string; full_name?: string };

      if (!res.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء الحفظ');
      }

      await refreshProfile();
      toast.success('تم حفظ الاسم بنجاح');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">الإعدادات</h1>
        <p className="text-muted-foreground">إدارة بيانات حسابك الشخصي.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-8">

        {/* Avatar */}
        <div className="flex items-center gap-5">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name || profile.email}
              className="w-16 h-16 rounded-2xl object-cover border border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-border flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
          )}
          <div>
            <div className="font-bold text-lg">{profile?.full_name || profile?.email}</div>
            <div className="text-sm text-muted-foreground">{profile?.email}</div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Edit Name */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="bg-muted/50"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">البريد الإلكتروني مرتبط بحساب جوجل ولا يمكن تغييره.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: يوسف بن علي"
              dir="rtl"
              maxLength={80}
              disabled={isSaving}
            />
          </div>

          <Button
            type="submit"
            disabled={isSaving || !fullName.trim() || fullName.trim() === (profile?.full_name ?? '')}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التغييرات
          </Button>
        </form>

        <div className="border-t border-border" />

        {/* Account Info */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">معلومات الحساب</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">الرصيد الحالي</span>
              <div className="font-bold text-lg mt-0.5">{profile?.credits_balance?.toLocaleString() || 0} حرف</div>
            </div>
            {profile?.is_admin && (
              <div>
                <span className="text-muted-foreground">الصلاحية</span>
                <div className="font-bold text-lg mt-0.5 text-primary">مدير</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
