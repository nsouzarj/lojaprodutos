import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iwtdipkqjyibbkppjvcl.supabase.co';
const supabaseKey = 'sb_publishable_w5CCa0L1aN3a91jVPHoXtg_nw1LQdB-';

export const supabase = createClient(supabaseUrl, supabaseKey);
