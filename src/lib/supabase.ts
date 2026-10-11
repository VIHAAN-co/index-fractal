import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvpuzysbkjzrlxhoiivp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2cHV6eXNia2p6cmx4aG9paXZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcwNjU1MywiZXhwIjoyMTA3MjgyNTUzfQ.bVPjiJJ19tPzlmjUE_IresbIBnJOPb246dlaq-UdS58';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
