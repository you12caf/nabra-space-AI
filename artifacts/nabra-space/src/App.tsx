import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import React, { useEffect } from 'react';
import { useAttributeReferral } from '@workspace/api-client-react';

const Landing = React.lazy(() => import('@/pages/landing'));
const Login = React.lazy(() => import('@/pages/login'));
const Generate = React.lazy(() => import('@/pages/generate'));
const History = React.lazy(() => import('@/pages/history'));
const Pricing = React.lazy(() => import('@/pages/pricing'));
const Gifts = React.lazy(() => import('@/pages/gifts'));
const Admin = React.lazy(() => import('@/pages/admin'));
const Settings = React.lazy(() => import('@/pages/settings'));

const queryClient = new QueryClient();

function AttributeReferralTracker() {
  const attributeReferral = useAttributeReferral();

  useEffect(() => {
    // If a ref code exists in localStorage and user just logged in, try to attribute it
    const code = localStorage.getItem('referral_code');
    // Note: We might only want to run this once after sign up. The backend usually ignores if already attributed.
    if (code) {
      attributeReferral.mutate({ data: { referral_code: code } }, {
        onSuccess: () => {
          localStorage.removeItem('referral_code'); // Clean up after successful attribution
        },
        onError: () => {
          // If error (like already attributed), maybe just remove it anyway
          localStorage.removeItem('referral_code');
        }
      });
    }
  }, []);

  return null;
}

function Router() {
  return (
    <React.Suspense fallback={<div className="h-screen w-full flex items-center justify-center">جاري التحميل...</div>}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        
        <Route path="/generate">
          <ProtectedRoute><Generate /></ProtectedRoute>
        </Route>
        
        <Route path="/history">
          <ProtectedRoute><History /></ProtectedRoute>
        </Route>
        
        <Route path="/pricing">
          <ProtectedRoute><Pricing /></ProtectedRoute>
        </Route>
        
        <Route path="/gifts">
          <ProtectedRoute><Gifts /></ProtectedRoute>
        </Route>
        
        <Route path="/admin">
          <ProtectedRoute requireAdmin><Admin /></ProtectedRoute>
        </Route>

        <Route path="/settings">
          <ProtectedRoute><Settings /></ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AttributeReferralTracker />
          <Router />
        </WouterRouter>
        <Toaster dir="rtl" position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
