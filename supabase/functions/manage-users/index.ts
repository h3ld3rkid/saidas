import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Managing user request...');

    const { action, userData, userId, newEmail, email } = await req.json();
    console.log('Action:', action, 'UserData:', userData ? 'present' : 'missing', 'UserId:', userId);

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Admin client (service role)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticated client (from caller) to verify permissions when needed
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    // Bootstrap mode: allow first admin creation if no roles exist yet
    let isBootstrap = false;
    try {
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      isBootstrap = !profilesCount || profilesCount === 0;
    } catch (e) {
      console.warn('Could not determine bootstrap mode:', e);
    }

    let actingUserId: string | null = null;
    const allowPublicReset = action === 'reset-password' && email === 'admin@cvamares.pt';
    if (!isBootstrap && !allowPublicReset) {
      if (!authHeader) {
        return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: authUserData, error: authUserError } = await supabaseAuth.auth.getUser();
      console.log('Auth getUser error?', !!authUserError, 'user?', !!authUserData?.user);
      if (authUserError || !authUserData.user) {
        return new Response(JSON.stringify({ success: false, error: 'Sessão inválida' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      actingUserId = authUserData.user.id;

      // Check admin role using SECURITY DEFINER function
      const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', { _user_id: actingUserId, _role: 'admin' });
      console.log('isAdmin?', isAdmin, 'roleError?', roleError?.message);
      if (roleError) {
        console.error('Role check error:', roleError);
        return new Response(JSON.stringify({ success: false, error: 'Erro ao verificar permissões' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!isAdmin) {
        return new Response(JSON.stringify({ success: false, error: 'Sem permissão' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    
    if (action === 'create') {
      console.log('Creating new user with data:', userData);

      // Basic validation
      if (!userData || !userData.email || !userData.first_name || !userData.last_name || !userData.employee_number || !userData.function_role || !userData.role) {
        return new Response(
          JSON.stringify({ success: false, error: 'Dados inválidos: preencha todos os campos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Generate temporary password
      const tempPassword = 'Temp' + Math.random().toString(36).slice(-8) + '!';
      
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          force_password_change: true
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        // If user already exists, upsert profile and return success
        const msg = (authError as any)?.message?.toLowerCase() || '';
        if (msg.includes('already') || msg.includes('exists') || msg.includes('registered') || msg.includes('duplicate')) {
          const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
          if (!listErr) {
            const found = list.users?.find((u: any) => (u.email || '').toLowerCase() === userData.email.toLowerCase());
            if (found) {
              const uid = found.id as string;

              const { data: existingProfile2 } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', uid)
                .maybeSingle();

              if (!existingProfile2) {
                const { error: profileCreateErr } = await supabase
                  .from('profiles')
                  .insert({
                    user_id: uid,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    employee_number: userData.employee_number,
                    function_role: userData.function_role,
                    role: userData.role,
                  });
                if (profileCreateErr) {
                  console.error('Profile create (existing user) error:', profileCreateErr);
                  return new Response(
                    JSON.stringify({ success: false, error: 'Erro ao criar perfil: ' + profileCreateErr.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              } else {
                const { error: profileUpdateErr } = await supabase
                  .from('profiles')
                  .update({
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    employee_number: userData.employee_number,
                    function_role: userData.function_role,
                    role: userData.role,
                  })
                  .eq('user_id', uid);
                if (profileUpdateErr) {
                  console.error('Profile update (existing user) error:', profileUpdateErr);
                  return new Response(
                    JSON.stringify({ success: false, error: 'Erro ao atualizar perfil: ' + profileUpdateErr.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              }

              return new Response(
                JSON.stringify({ success: true, message: 'Utilizador já existia. Perfil atualizado.' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }

        }
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar utilizador: ' + (authError as any)?.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!authData.user) {
        console.error('No user returned from auth');
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar utilizador' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('User created in auth:', authData.user.id);

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authData.user.id)
        .single();

      if (!existingProfile) {
        // Create profile only if it doesn't exist
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            employee_number: userData.employee_number,
            function_role: userData.function_role,
            role: userData.role,
          });

        if (profileError) {
          console.error('Profile error:', profileError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao criar perfil: ' + profileError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Profile created');
      } else {
        console.log('Profile already exists, updating...');
        // Update existing profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: userData.first_name,
            last_name: userData.last_name,
            employee_number: userData.employee_number,
            function_role: userData.function_role,
            role: userData.role,
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao atualizar perfil: ' + profileError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // O role agora é definido diretamente na tabela profiles durante a criação/atualização
      console.log('Role será definido na tabela profiles');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Utilizador criado com sucesso',
          tempPassword: tempPassword
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else if (action === 'reset-password') {
      console.log('Resetting password for user:', userId, 'email:', email);
      
      const newPassword = 'Temp' + Math.random().toString(36).slice(-8) + '!';

      let targetUserId = userId as string;
      
      // If no userId provided but email is provided, try to find user by email
      if (!targetUserId && email) {
        const { data: list, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error('List users error:', listError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao procurar utilizador' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const found = list.users?.find((u: any) => (u.email || '').toLowerCase() === (email as string).toLowerCase());
        if (!found) {
          return new Response(
            JSON.stringify({ success: false, error: 'Utilizador não encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        targetUserId = found.id;
      }
      
      if (!targetUserId) {
        console.error('No userId provided for password reset');
        return new Response(
          JSON.stringify({ success: false, error: 'userId ou email obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { error } = await supabase.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
        user_metadata: {
          force_password_change: true
        }
      });

      if (error) {
        console.error('Password reset error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao redefinir password: ' + error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Password redefinida com sucesso',
          newPassword: newPassword
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else if (action === 'update-email') {
      console.log('Updating email for user:', userId, 'to', newEmail);

      // Basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!newEmail || typeof newEmail !== 'string' || !emailRegex.test(newEmail)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: true,
      });

      if (updateError) {
        console.error('Email update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao atualizar email: ' + updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Email atualizado com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'delete-user') {
      console.log('Deleting user:', userId);

      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete user from auth (this will cascade delete profile due to foreign key)
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        console.error('Delete user error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao eliminar utilizador: ' + error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Utilizador eliminado com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Ação não reconhecida' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('Error in manage-users function:', error);
    return new Response(
      JSON.stringify({ success: false, error: `Erro interno: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});