UPDATE public.user_profiles SET plan_id = '02341e16-ef9c-459e-a6af-fceb77458d94' WHERE user_id = '0092ffb5-7e25-4efc-9e49-817e3fa908bb';

UPDATE public.user_profiles SET plan_id = '02341e16-ef9c-459e-a6af-fceb77458d94' WHERE permission_profile_id IN (SELECT id FROM public.permission_profiles WHERE user_id = '0092ffb5-7e25-4efc-9e49-817e3fa908bb');