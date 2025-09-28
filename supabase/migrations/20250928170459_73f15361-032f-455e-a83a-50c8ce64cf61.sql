-- Resolver problema de foreign key constraint ao eliminar utilizadores
-- O erro indica que existe constraint entre vehicle_exits.user_id e auth.users
-- Vamos alterar para usar SET NULL quando um utilizador é eliminado

-- Primeiro, remover a constraint existente
ALTER TABLE public.vehicle_exits 
DROP CONSTRAINT IF EXISTS vehicle_exits_user_id_fkey;

-- Adicionar nova constraint com ON DELETE SET NULL
ALTER TABLE public.vehicle_exits 
ADD CONSTRAINT vehicle_exits_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;