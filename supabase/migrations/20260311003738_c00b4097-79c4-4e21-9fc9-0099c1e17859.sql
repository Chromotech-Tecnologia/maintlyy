
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.user_profiles WHERE user_id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.has_system_permission(_user_id uuid, _resource text, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
