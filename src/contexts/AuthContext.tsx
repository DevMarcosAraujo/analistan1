import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  email: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAdmin: boolean
  mustChangePassword: boolean
  signIn: (email: string, senha: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  concluirTrocaSenha: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [loading, setLoading] = useState(true)

  async function carregarPerfil(u: User | null) {
    if (!u) {
      setIsAdmin(false)
      setMustChangePassword(false)
      return
    }
    const { data } = await supabase
      .from("perfis")
      .select("is_admin, must_change_password")
      .eq("id", u.id)
      .single()
    setIsAdmin(Boolean(data?.is_admin))
    setMustChangePassword(Boolean(data?.must_change_password))
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user
      const u = sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? "" } : null
      setUser(u)
      await carregarPerfil(u)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user
      const u = sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? "" } : null
      setUser(u)
      await carregarPerfil(u)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, senha: string) {
    const { data: bloqueado } = await supabase.rpc("checar_bloqueio_login", { p_email: email })
    if (bloqueado) {
      return {
        error:
          "Conta bloqueada por excesso de tentativas erradas. Solicite a um administrador para desbloquear.",
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      await supabase.rpc("registrar_falha_login", { p_email: email })
      return { error: error.message === "Invalid login credentials" ? "Email ou senha invalidos" : error.message }
    }

    await supabase.rpc("registrar_sucesso_login", { p_email: email })
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setMustChangePassword(false)
  }

  async function concluirTrocaSenha() {
    const { error } = await supabase.rpc("concluir_troca_senha")
    if (error) throw error
    setMustChangePassword(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, mustChangePassword, signIn, signOut, concluirTrocaSenha }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}
