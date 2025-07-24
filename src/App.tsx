import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route 
              path="/manutencoes" 
              element={<ComingSoon title="Manutenções" description="Módulo de gestão de manutenções mensais" />} 
            />
            <Route 
              path="/empresas" 
              element={<ComingSoon title="Empresas Terceiras" description="Módulo de gestão de empresas terceiras" />} 
            />
            <Route 
              path="/equipes" 
              element={<ComingSoon title="Equipes" description="Módulo de gestão de equipes" />} 
            />
            <Route 
              path="/tipos-manutencao" 
              element={<ComingSoon title="Tipos de Manutenção" description="Módulo de tipos de manutenção" />} 
            />
            <Route 
              path="/cofre" 
              element={<ComingSoon title="Cofre de Senhas" description="Módulo de cofre de senhas seguro" />} 
            />
            <Route 
              path="/usuarios" 
              element={<ComingSoon title="Usuários" description="Módulo de gestão de usuários" />} 
            />
            <Route 
              path="/permissoes" 
              element={<ComingSoon title="Permissões" description="Módulo de controle de permissões" />} 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
