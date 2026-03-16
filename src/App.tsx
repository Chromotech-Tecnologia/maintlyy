import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Manutencoes from "./pages/Manutencoes";
import Empresas from "./pages/Empresas";
import Equipes from "./pages/Equipes";
import TiposManutencao from "./pages/TiposManutencao";
import CofreSenhas from "./pages/CofreSenhas";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import SetupPassword from "./pages/SetupPassword";
import PerfilUsuarios from "./pages/PerfilUsuarios";
import PermissionProfiles from "./pages/PermissionProfiles";
import SuperAdminPanel from "./pages/SuperAdminPanel";
import Relatorios from "./pages/Relatorios";
import RelatorioPublico from "./pages/RelatorioPublico";
import Assinaturas from "./pages/Assinaturas";
import MonitoramentoSites from "./pages/MonitoramentoSites";
import Auditoria from "./pages/Auditoria";
const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/setup-password" element={<SetupPassword />} />
              <Route path="/relatorio-publico/:publicId" element={<RelatorioPublico />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/clientes" element={<Clientes />} />
                      <Route path="/manutencoes" element={<Manutencoes />} />
                      <Route path="/empresas" element={<Empresas />} />
                      <Route path="/equipes" element={<Equipes />} />
                      <Route path="/tipos-manutencao" element={<TiposManutencao />} />
                      <Route path="/cofre" element={<CofreSenhas />} />
                      <Route path="/perfil-usuarios" element={<PerfilUsuarios />} />
                      <Route path="/permissoes" element={<PermissionProfiles />} />
                      <Route path="/super-admin" element={<SuperAdminPanel />} />
                      <Route path="/relatorios" element={<Relatorios />} />
                      <Route path="/assinaturas" element={<Assinaturas />} />
                      <Route path="/monitoramento" element={<MonitoramentoSites />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
