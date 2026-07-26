import React, { useState } from 'react';
import { 
  useGetAdminOverview, 
  useListAdminUsers, 
  useListAdminTransactions,
  useListAdminPromoCodes,
  useListAdminAffiliates,
  useUpdateUserCredits,
  useUpdateUserStatus,
  useCreateAdminPromoCode,
  useUpdateAdminPromoCode,
  useDeleteAdminPromoCode,
  useUpdateAdminAffiliate,
  useRecordAffiliatePayout,
  ListAdminTransactionsStatus
} from '@workspace/api-client-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Users, CreditCard, Gift, TrendingUp, DollarSign, Activity, Check, X, Edit, Trash2, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

function OverviewTab() {
  const { data, isLoading } = useGetAdminOverview();

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_users}</div>
            <p className="text-xs text-muted-foreground mt-1 text-emerald-500">
              +{data.user_growth_pct.toFixed(1)}% نمو
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات الكلية</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" dir="ltr">${data.total_revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إيرادات هذا الشهر</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" dir="ltr">${data.monthly_revenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الحروف المستهلكة</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_characters_generated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">نسبة النجاح: {data.success_rate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>نمو المستخدمين (آخر 30 يوم)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data.user_growth_data && data.user_growth_data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.user_growth_data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'dd MMM')} fontSize={12} />
                  <YAxis fontSize={12} width={40} />
                  <RechartsTooltip labelFormatter={(val) => format(new Date(val), 'dd MMM yyyy')} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات كافية</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>أحدث المعاملات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recent_transactions?.map(tx => (
                <div key={tx.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{tx.email || 'مستخدم مجهول'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-emerald-600" dir="ltr">+${tx.amount_usd.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{tx.characters_granted?.toLocaleString()} حرف</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState('');
  const { data: users, refetch } = useListAdminUsers({ search: search.length > 2 ? search : undefined });
  
  const updateCredits = useUpdateUserCredits();
  const updateStatus = useUpdateUserStatus();

  const handleUpdateCredits = (userId: string, type: 'set'|'add'|'subtract', amount: number) => {
    updateCredits.mutate({ id: userId, data: { type, amount } }, {
      onSuccess: () => {
        toast.success('تم تحديث رصيد المستخدم');
        refetch();
      },
      onError: (err: any) => toast.error(err?.data?.error || 'حدث خطأ')
    });
  };

  const handleToggleBan = (userId: string, currentStatus: boolean) => {
    updateStatus.mutate({ id: userId, data: { is_banned: !currentStatus } }, {
      onSuccess: () => {
        toast.success('تم تحديث حالة المستخدم');
        refetch();
      },
      onError: (err: any) => toast.error(err?.data?.error || 'حدث خطأ')
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input 
          placeholder="ابحث بالبريد الإلكتروني..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>تاريخ التسجيل</TableHead>
              <TableHead>الرصيد</TableHead>
              <TableHead>التوليدات</TableHead>
              <TableHead>الإنفاق</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map(user => (
              <TableRow key={user.user_id}>
                <TableCell>
                  <div className="font-medium">{user.email}</div>
                  {user.is_admin && <Badge variant="default" className="text-[10px] mt-1">مدير</Badge>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(user.created_at), 'dd MMM yyyy')}</TableCell>
                <TableCell className="font-bold">{user.credits_balance.toLocaleString()}</TableCell>
                <TableCell>{user.generation_count}</TableCell>
                <TableCell className="text-emerald-600 font-bold" dir="ltr">${user.total_spent.toFixed(2)}</TableCell>
                <TableCell>
                  {user.is_banned ? <Badge variant="destructive">محظور</Badge> : <Badge variant="outline">نشط</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">الرصيد</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>تعديل رصيد: {user.email}</DialogTitle></DialogHeader>
                        <form className="space-y-4 pt-4" onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const type = formData.get('type') as 'set'|'add'|'subtract';
                          const amount = Number(formData.get('amount'));
                          handleUpdateCredits(user.user_id, type, amount);
                        }}>
                          <div className="space-y-2">
                            <Label>العملية</Label>
                            <select name="type" className="w-full border rounded-md p-2 bg-background">
                              <option value="add">إضافة (+)</option>
                              <option value="subtract">خصم (-)</option>
                              <option value="set">تعيين (=)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>القيمة (عدد الحروف)</Label>
                            <Input name="amount" type="number" min="0" required defaultValue="10000" />
                          </div>
                          <Button type="submit" className="w-full" disabled={updateCredits.isPending}>تحديث الرصيد</Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {!user.is_admin && (
                      <Button 
                        variant={user.is_banned ? "default" : "destructive"} 
                        size="sm" 
                        onClick={() => handleToggleBan(user.user_id, user.is_banned)}
                      >
                        {user.is_banned ? 'رفع الحظر' : 'حظر'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TransactionsTab() {
  const [status, setStatus] = useState<ListAdminTransactionsStatus | undefined>(undefined);
  const { data: txs } = useListAdminTransactions({ status });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <select 
          className="border border-input rounded-md px-3 py-2 bg-background"
          value={status || ''}
          onChange={(e) => setStatus(e.target.value ? e.target.value as ListAdminTransactionsStatus : undefined)}
        >
          <option value="">جميع الحالات</option>
          <option value="completed">مكتمل</option>
          <option value="pending">معلق</option>
          <option value="failed">فشل</option>
        </select>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المستخدم</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>الحروف الممنوحة</TableHead>
              <TableHead>معرف Dodo</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txs?.map(tx => (
              <TableRow key={tx.id}>
                <TableCell className="font-medium">{tx.email || tx.user_id}</TableCell>
                <TableCell className="text-emerald-600 font-bold" dir="ltr">${tx.amount_usd.toFixed(2)}</TableCell>
                <TableCell>{tx.characters_granted?.toLocaleString() || '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{tx.dodo_payment_id || '-'}</TableCell>
                <TableCell>
                  {tx.status === 'completed' && <Badge className="bg-emerald-500/10 text-emerald-600">مكتمل</Badge>}
                  {tx.status === 'pending' && <Badge className="bg-amber-500/10 text-amber-600">معلق</Badge>}
                  {tx.status === 'failed' && <Badge variant="destructive">فشل</Badge>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(tx.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PromoCodesTab() {
  const { data: codes, refetch } = useListAdminPromoCodes();
  const createCode = useCreateAdminPromoCode();
  const updateCode = useUpdateAdminPromoCode();
  const deleteCode = useDeleteAdminPromoCode();

  const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createCode.mutate({
      data: {
        code: fd.get('code') as string,
        characters_granted: Number(fd.get('characters_granted')),
        max_total_uses: Number(fd.get('max_total_uses')),
        max_uses_per_user: Number(fd.get('max_uses_per_user')) || 1,
      }
    }, {
      onSuccess: () => {
        toast.success('تم إنشاء الكود بنجاح');
        (e.target as HTMLFormElement).reset();
        refetch();
      },
      onError: (err: any) => toast.error(err?.data?.error || 'حدث خطأ')
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="col-span-1 h-fit">
        <CardHeader>
          <CardTitle>إنشاء كود جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label>الكود</Label>
              <div className="flex gap-2">
                <Input name="code" id="code-input" required className="font-mono uppercase" />
                <Button type="button" variant="outline" onClick={() => {
                  const input = document.getElementById('code-input') as HTMLInputElement;
                  if (input) input.value = generateRandomCode();
                }}>توليد</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>الحروف الممنوحة</Label>
              <Input name="characters_granted" type="number" min="1" required defaultValue="5000" />
            </div>
            <div className="space-y-2">
              <Label>الحد الأقصى للاستخدام الكلي</Label>
              <Input name="max_total_uses" type="number" min="1" required defaultValue="100" />
            </div>
            <div className="space-y-2">
              <Label>الحد الأقصى لكل مستخدم</Label>
              <Input name="max_uses_per_user" type="number" min="1" required defaultValue="1" />
            </div>
            <Button type="submit" className="w-full" disabled={createCode.isPending}>إنشاء</Button>
          </form>
        </CardContent>
      </Card>

      <div className="col-span-1 lg:col-span-2">
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الحروف</TableHead>
                <TableHead>الاستخدامات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes?.map(code => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-bold">{code.code}</TableCell>
                  <TableCell>{code.characters_granted.toLocaleString()}</TableCell>
                  <TableCell>{code.current_uses} / {code.max_total_uses}</TableCell>
                  <TableCell>
                    {code.is_active ? <Badge variant="outline" className="border-emerald-500 text-emerald-600">نشط</Badge> : <Badge variant="outline">متوقف</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateCode.mutate({ id: code.id, data: { is_active: !code.is_active } }, { onSuccess: () => refetch() })}
                      >
                        {code.is_active ? 'إيقاف' : 'تفعيل'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          if(confirm('هل أنت متأكد من حذف هذا الكود؟')) {
                            deleteCode.mutate({ id: code.id }, { onSuccess: () => refetch() });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function AffiliatesTab() {
  const { data: affiliates, refetch } = useListAdminAffiliates();
  const updateAffiliate = useUpdateAdminAffiliate();
  const recordPayout = useRecordAffiliatePayout();

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>الكود</TableHead>
              <TableHead>النسبة</TableHead>
              <TableHead>النتائج (ن/ت/م)</TableHead>
              <TableHead>معلق</TableHead>
              <TableHead>متاح للسحب</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliates?.map(aff => (
              <TableRow key={aff.user_id}>
                <TableCell className="font-medium">{aff.email || 'مجهول'}</TableCell>
                <TableCell className="font-mono text-sm">{aff.referral_code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      defaultValue={aff.commission_rate} 
                      className="w-20 h-8"
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val !== aff.commission_rate) {
                          updateAffiliate.mutate({ id: aff.user_id, data: { commission_rate: val } }, { onSuccess: () => refetch() });
                        }
                      }}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {aff.total_clicks} / {aff.total_signups} / {aff.total_conversions}
                </TableCell>
                <TableCell className="text-amber-600 font-bold" dir="ltr">${aff.pending_balance.toFixed(2)}</TableCell>
                <TableCell className="text-emerald-600 font-bold" dir="ltr">${aff.available_balance.toFixed(2)}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={aff.available_balance <= 0}>تسجيل دفعة</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>تسجيل دفعة مسوق: {aff.email}</DialogTitle></DialogHeader>
                      <form className="space-y-4 pt-4" onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        recordPayout.mutate({ id: aff.user_id, data: { amount: Number(fd.get('amount')), note: fd.get('note') as string } }, {
                          onSuccess: () => {
                            toast.success('تم تسجيل الدفعة');
                            refetch();
                          },
                          onError: (err: any) => toast.error(err?.data?.error || 'حدث خطأ')
                        });
                      }}>
                        <div className="space-y-2">
                          <Label>المبلغ (الحد الأقصى المتاح: ${aff.available_balance.toFixed(2)})</Label>
                          <Input name="amount" type="number" step="0.01" max={aff.available_balance} min="0.01" required defaultValue={aff.available_balance} />
                        </div>
                        <div className="space-y-2">
                          <Label>ملاحظة (اختياري)</Label>
                          <Input name="note" placeholder="معرف التحويل أو طريقة الدفع..." />
                        </div>
                        <Button type="submit" className="w-full" disabled={recordPayout.isPending}>تسجيل الدفعة</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <div className="max-w-7xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">لوحة الإدارة</h1>
        <p className="text-muted-foreground">تحكم كامل في منصة Nabra Space</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-8 bg-card border w-full justify-start overflow-x-auto h-auto p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg px-6 py-3">نظرة عامة</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg px-6 py-3">المستخدمون</TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg px-6 py-3">المعاملات</TabsTrigger>
          <TabsTrigger value="promo" className="rounded-lg px-6 py-3">الأكواد الترويجية</TabsTrigger>
          <TabsTrigger value="affiliates" className="rounded-lg px-6 py-3">المسوقون</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="transactions"><TransactionsTab /></TabsContent>
        <TabsContent value="promo"><PromoCodesTab /></TabsContent>
        <TabsContent value="affiliates"><AffiliatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
