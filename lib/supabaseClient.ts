import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your project's URL and anon key from Supabase settings
const supabase_url = 'https://bnnewfparlqcrflyctul.supabase.co';
const supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJubmV3ZnBhcmxxY3JmbHljdHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjI3NDEsImV4cCI6MjA3NjA5ODc0MX0.iQAMW-OKgHVFExlY3sS-LS6Jx8AHnQpmjrCqvV7CZgc';

// Fix: Removed the configuration check for placeholder values.
// This check caused a TypeScript error because it compares a hardcoded string with a different literal string, which is always false.
// The check is no longer needed since the credentials have been provided.

export const supabase = createClient(supabase_url, supabase_anon_key);