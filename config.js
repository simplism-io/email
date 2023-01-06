require('dotenv').config()
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.MODE == 'debug' ? process.env.SUPABASE_URL_DEBUG : process.env.SUPABASE_URL_PROD;
const supabaseAnonKey = process.env.MODE == 'debug' ? process.env.SUPABASE_KEY_DEBUG : process.env.SUPABASE_KEY_PROD;

module.exports = createClient(supabaseUrl, supabaseAnonKey);


