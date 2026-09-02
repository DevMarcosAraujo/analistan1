// Edge Function: reseta a senha de um usuario para uma senha temporaria
// gerada aleatoriamente. So funciona se quem chamar for admin (checado
// via tabela perfis). Usa a service role key, que so existe aqui no
// servidor (nunca no navegador).
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function gerarSenhaTemporaria() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  let senha = ""
  for (let i = 0; i < 10; i++) {
    senha += alfabeto[Math.floor(Math.random() * alfabeto.length)]
  }
  return senha
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    // Cliente com a sessao de quem chamou, so pra confirmar quem e e se e admin.
    const supabaseCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await supabaseCaller.auth.getUser()
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: perfil } = await supabaseCaller
      .from("perfis")
      .select("is_admin")
      .eq("id", userData.user.id)
      .single()

    if (!perfil?.is_admin) {
      return new Response(JSON.stringify({ error: "Somente admin pode resetar senhas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { user_id } = await req.json()
    if (!user_id || typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "user_id e obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const senhaTemporaria = gerarSenhaTemporaria()

    // Cliente com a service role, unico que pode trocar a senha de outro usuario.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: senhaTemporaria,
    })
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    await supabaseAdmin
      .from("perfis")
      .update({ must_change_password: true, failed_attempts: 0, locked: false, locked_em: null })
      .eq("id", user_id)

    return new Response(JSON.stringify({ senha: senhaTemporaria }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
