// Custom type definitions to bypass outdated generated types
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://arpghkhpgwsybjtgjkty.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycGdoa2hwZ3dzeWJqdGdqa3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MzMzOTIsImV4cCI6MjA3NDEwOTM5Mn0.2T_HfFLYkZUzg6OfhgV2s8KVfQdTfzOcdCEcvowCT-M";

// Create untyped client to bypass type issues
export const supabaseDb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
