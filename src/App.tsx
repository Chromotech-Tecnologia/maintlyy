import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Manutencoes from "./pages/Manutencoes";
import Empresas from "./pages/Empresas";
import Equipes from "./pages/Equipes";
import TiposManutencao from "./pages/TiposManutencao";
import CofreSenhas from "./pages/CofreSenhas";
import ComingSoon from "./pages/ComingSoon";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/manutencoes" element={<Manutencoes />} />
                    <Route path="/empresas" element={<Empresas />} />
                    <Route path="/equipes" element={<Equipes />} />
                    <Route path="/tipos-manutencao" element={<TiposManutencao />} />
                    <Route path="/cofre" element={<CofreSenhas />} />
                    <Route 
                      path="/permissoes" 
                      element={<ComingSoon title="Permissões" description="Módulo de controle de permissões" />} 
                    />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
