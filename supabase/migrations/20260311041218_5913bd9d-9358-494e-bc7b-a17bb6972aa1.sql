INSERT INTO public.landing_plans (nome, tipo, categoria, preco, max_usuarios, max_equipes, descricao, recursos, whatsapp_numero, whatsapp_mensagem, texto_botao, destaque, ordem, ativo) VALUES

-- PLANO GRATUITO
('Starter', 'individual', 'gratis', NULL, 1, 1, 
 'Ideal para profissionais autônomos que querem organizar suas manutenções.',
 '["Até 50 manutenções/mês", "1 empresa cadastrada", "1 equipe", "Cofre de senhas básico", "Relatórios simples", "Suporte por email"]'::jsonb,
 NULL, NULL,
 'Começar Grátis', false, 1, true),

-- PLANO PROFISSIONAL
('Profissional', 'individual', 'pago', 'R$ 49,90/mês', 1, 3,
 'Para profissionais que precisam de mais poder e recursos avançados.',
 '["Manutenções ilimitadas", "Até 5 empresas", "3 equipes", "Cofre de senhas completo", "Relatórios avançados com PDF", "Links públicos de relatórios", "Importação via Excel", "Suporte prioritário"]'::jsonb,
 '5511999999999', 'Olá! Tenho interesse no plano Profissional do Maintly. Gostaria de mais informações.',
 'Quero ser Profissional', false, 2, true),

-- PLANO EQUIPE (DESTAQUE)
('Equipe', 'equipe', 'pago', 'R$ 99,90/mês', 5, 10,
 'Perfeito para pequenas e médias equipes de manutenção.',
 '["Tudo do plano Profissional", "Até 5 usuários inclusos", "10 equipes", "Empresas ilimitadas", "Perfis de permissão personalizados", "Controle de acesso por empresa", "Controle de acesso por cliente", "Cofre com permissões por senha", "Relatórios compartilháveis", "Suporte prioritário via WhatsApp"]'::jsonb,
 '5511999999999', 'Olá! Tenho interesse no plano Equipe do Maintly para minha empresa. Gostaria de mais informações.',
 'Escolher plano Equipe', true, 3, true),

-- PLANO ENTERPRISE
('Enterprise', 'personalizado', 'pago', 'Sob consulta', 999, 999,
 'Para empresas que precisam de escala, personalização e suporte dedicado.',
 '["Tudo do plano Equipe", "Usuários ilimitados", "Equipes ilimitadas", "Onboarding personalizado", "API dedicada (em breve)", "SLA de suporte garantido", "Treinamento da equipe", "Gerente de conta exclusivo"]'::jsonb,
 '5511999999999', 'Olá! Tenho interesse no plano Enterprise do Maintly. Gostaria de agendar uma demonstração.',
 'Falar com especialista', false, 4, true);