import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigurado) {
  console.warn(
    "Supabase nao configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env"
  )
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "")
