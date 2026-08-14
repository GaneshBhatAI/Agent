import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwutrfmmcorktztefrja.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_E4XKAZgjI27EdpVNP6qC0w_UlcwlTpe';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
