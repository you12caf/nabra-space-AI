import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/contexts/AuthContext';
import App from './App.tsx';
import './index.css';

setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
