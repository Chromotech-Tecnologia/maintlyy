-- Criar tabela para grupos de senhas
CREATE TABLE public.grupos_cofre (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_grupo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, nome_grupo)
);

-- Enable RLS
ALTER TABLE public.grupos_cofre ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own grupos_cofre" 
ON public.grupos_cofre 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own grupos_cofre" 
ON public.grupos_cofre 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grupos_cofre" 
ON public.grupos_cofre 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grupos_cofre" 
ON public.grupos_cofre 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_grupos_cofre_updated_at
BEFORE UPDATE ON public.grupos_cofre
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();