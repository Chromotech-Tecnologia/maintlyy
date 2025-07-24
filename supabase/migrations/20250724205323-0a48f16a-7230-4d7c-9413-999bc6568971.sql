-- Criação das tabelas do sistema Maintly

-- Tabela de empresas terceiras
CREATE TABLE public.empresas_terceiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_empresa TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  empresa_terceira_id UUID NOT NULL REFERENCES public.empresas_terceiras(id) ON DELETE CASCADE,
  nome_cliente TEXT,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de pacotes de manutenção
CREATE TABLE public.pacotes_manutencao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  valor_mensal DECIMAL(10,2),
  valor_por_hora DECIMAL(10,2),
  limite_horas_mensais INTEGER,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de tipos de manutenção
CREATE TABLE public.tipos_manutencao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_tipo_manutencao TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de equipes
CREATE TABLE public.equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_equipe TEXT NOT NULL,
  membros TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela do cofre de senhas
CREATE TABLE public.cofre_senhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  empresa_terceira_id UUID REFERENCES public.empresas_terceiras(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  grupo TEXT,
  nome_acesso TEXT NOT NULL,
  url_acesso TEXT,
  login TEXT,
  senha TEXT NOT NULL, -- será criptografada no frontend
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de manutenções
CREATE TABLE public.manutencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  empresa_terceira_id UUID NOT NULL REFERENCES public.empresas_terceiras(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_manutencao_id UUID NOT NULL REFERENCES public.tipos_manutencao(id) ON DELETE CASCADE,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE SET NULL,
  data_inicio DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  data_fim DATE,
  hora_fim TIME,
  tempo_total INTEGER, -- em minutos
  descricao TEXT,
  solicitante TEXT,
  status TEXT DEFAULT 'Em andamento' CHECK (status IN ('Em andamento', 'Finalizado')),
  responsavel TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.empresas_terceiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacotes_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofre_senhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para empresas_terceiras
CREATE POLICY "Users can view their own empresas_terceiras" 
ON public.empresas_terceiras FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own empresas_terceiras" 
ON public.empresas_terceiras FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own empresas_terceiras" 
ON public.empresas_terceiras FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own empresas_terceiras" 
ON public.empresas_terceiras FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para clientes
CREATE POLICY "Users can view their own clientes" 
ON public.clientes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clientes" 
ON public.clientes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clientes" 
ON public.clientes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clientes" 
ON public.clientes FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para pacotes_manutencao
CREATE POLICY "Users can view their own pacotes_manutencao" 
ON public.pacotes_manutencao FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pacotes_manutencao" 
ON public.pacotes_manutencao FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pacotes_manutencao" 
ON public.pacotes_manutencao FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pacotes_manutencao" 
ON public.pacotes_manutencao FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para tipos_manutencao
CREATE POLICY "Users can view their own tipos_manutencao" 
ON public.tipos_manutencao FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tipos_manutencao" 
ON public.tipos_manutencao FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tipos_manutencao" 
ON public.tipos_manutencao FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tipos_manutencao" 
ON public.tipos_manutencao FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para equipes
CREATE POLICY "Users can view their own equipes" 
ON public.equipes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own equipes" 
ON public.equipes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own equipes" 
ON public.equipes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own equipes" 
ON public.equipes FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para cofre_senhas
CREATE POLICY "Users can view their own cofre_senhas" 
ON public.cofre_senhas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cofre_senhas" 
ON public.cofre_senhas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cofre_senhas" 
ON public.cofre_senhas FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cofre_senhas" 
ON public.cofre_senhas FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para manutencoes
CREATE POLICY "Users can view their own manutencoes" 
ON public.manutencoes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own manutencoes" 
ON public.manutencoes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manutencoes" 
ON public.manutencoes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manutencoes" 
ON public.manutencoes FOR DELETE 
USING (auth.uid() = user_id);

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_empresas_terceiras_updated_at
  BEFORE UPDATE ON public.empresas_terceiras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pacotes_manutencao_updated_at
  BEFORE UPDATE ON public.pacotes_manutencao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tipos_manutencao_updated_at
  BEFORE UPDATE ON public.tipos_manutencao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipes_updated_at
  BEFORE UPDATE ON public.equipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cofre_senhas_updated_at
  BEFORE UPDATE ON public.cofre_senhas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manutencoes_updated_at
  BEFORE UPDATE ON public.manutencoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_clientes_empresa_terceira ON public.clientes(empresa_terceira_id);
CREATE INDEX idx_pacotes_cliente ON public.pacotes_manutencao(cliente_id);
CREATE INDEX idx_manutencoes_cliente ON public.manutencoes(cliente_id);
CREATE INDEX idx_manutencoes_data ON public.manutencoes(data_inicio);
CREATE INDEX idx_cofre_cliente ON public.cofre_senhas(cliente_id);
CREATE INDEX idx_cofre_empresa ON public.cofre_senhas(empresa_terceira_id);