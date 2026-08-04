import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Coins, History, Gift, CreditCard, Shield, LogOut, Mic2, Menu, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { href: '/generate', label: 'الاستوديو', icon: Mic2 },
    { href: '/history', label: 'سجل التوليد', icon: History },
    { href: '/gifts', label: 'الهدايا والإحالات', icon: Gift },
    { href: '/pricing', label: 'الباقات', icon: CreditCard },
    { href: '/settings', label: 'الإعدادات', icon: Settings },
  ];

  if (profile?.is_admin) {
    navItems.push({ href: '/admin', label: 'لوحة الإدارة', icon: Shield });
  }

  const NavLinks = () => (
    <div className="flex flex-col gap-2 w-full">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group ${isActive ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
              <span>{item.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden absolute top-4 right-4 z-50">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] p-6 flex flex-col border-l-0 border-r border-border">
          <div className="flex items-center justify-center mb-10">
            <img src="/logo.png" alt="Nabra Space" className="h-14 w-auto object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105" />
          </div>

          <div className="mb-8 p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">الرصيد المتاح</span>
            <div className="flex items-center gap-2 text-foreground font-bold text-xl">
              <Coins className="w-5 h-5 text-accent" />
              <span>{profile?.credits_balance?.toLocaleString() || 0}</span>
              <span className="text-sm font-normal text-muted-foreground">حرف</span>
            </div>
          </div>

          <NavLinks />
          <div className="mt-auto">
            <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
              <span>تسجيل الخروج</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[280px] border-l border-border bg-card flex-col p-6 h-screen sticky top-0">
        <div className="flex items-center justify-center mb-10 px-2">
          <img src="/logo.png" alt="Nabra Space" className="h-20 w-auto object-contain drop-shadow-md transition-transform duration-300 hover:scale-105" />
        </div>

        <div className="mb-8 p-5 rounded-2xl bg-muted/50 border border-border flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">رصيدك الحالي</span>
          <div className="flex items-center gap-2 text-foreground font-bold text-2xl">
            <Coins className="w-6 h-6 text-accent" />
            <span>{profile?.credits_balance?.toLocaleString() || 0}</span>
            <span className="text-base font-normal text-muted-foreground mt-1">حرف</span>
          </div>
        </div>

        <nav className="flex-1">
          <NavLinks />
        </nav>

        <div className="pt-6 border-t border-border mt-auto">
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto relative">
        <div className="flex-1 p-4 pt-20 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
