import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ksikkbvxtnpwnisvckeg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaWtrYnZ4dG5wd25pc3Zja2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODM1OTAsImV4cCI6MjEwNjg1OTU5MH0.32_0NMzFN_5_-J9qo7rvVuscpa2wU7zxubMIMQgepsw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
});
