import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yqqinnmitiovawexutvz.supabase.co';
const supabaseKey = 'sb_publishable_PBT5DPfFJ4frjwNgx5KBBg_qCUXK4Cr';

export const supabase = createClient(supabaseUrl, supabaseKey);
