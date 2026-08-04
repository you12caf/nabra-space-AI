import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://xdksrkwlvamkznqmnqtt.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhka3Nya3dsdmFta3pucW1ucXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzkyMjUsImV4cCI6MjEwMDA1NTIyNX0.Pah61rzLzHXfMYiiRRhUDgQ8rUChf4PmErx3SlvlPe8'
);
