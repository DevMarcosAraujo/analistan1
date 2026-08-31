import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout } from "@/components/AppLayout"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { SetoresPage } from "@/pages/SetoresPage"
import { EquipamentosPage } from "@/pages/EquipamentosPage"
import { AcessosPage } from "@/pages/AcessosPage"
import { MapaPage } from "@/pages/MapaPage"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/setores" element={<SetoresPage />} />
              <Route path="/equipamentos" element={<EquipamentosPage />} />
              <Route path="/acessos" element={<AcessosPage />} />
              <Route path="/mapa" element={<MapaPage />} />
              <Route path="/mapa/:setorId" element={<MapaPage />} />
            </Route>
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
