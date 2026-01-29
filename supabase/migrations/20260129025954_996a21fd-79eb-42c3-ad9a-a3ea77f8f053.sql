-- Adicionar coluna can_view_details para controle granular de permissões
ALTER TABLE public.user_system_permissions 
ADD COLUMN IF NOT EXISTS can_view_details boolean DEFAULT false;

-- Atualizar função has_system_permission para incluir view_details
CREATE OR REPLACE FUNCTION public.has_system_permission(_user_id uuid, _resource text, _permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_system_permissions
    WHERE user_id = _user_id 
    AND resource_type = _resource
    AND (
      (_permission = 'view' AND can_view = true) OR
      (_permission = 'view_details' AND can_view_details = true) OR
      (_permission = 'edit' AND can_edit = true) OR
      (_permission = 'create' AND can_create = true) OR
      (_permission = 'delete' AND can_delete = true)
    )
  );
END;
$function$;