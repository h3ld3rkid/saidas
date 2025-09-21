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

    const { action, userData, userId } = await req.json();
    console.log('Action:', action, 'UserData:', userData);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'create') {
      console.log('Creating new user...');
      
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      });

      if (authError) {
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar utilizador: ' + authError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!authData.user) {
        console.error('No user returned from auth');
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar utilizador' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          });

        if (profileError) {
          console.error('Profile error:', profileError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao criar perfil: ' + profileError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao atualizar perfil: ' + profileError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', authData.user.id)
        .eq('role', userData.role)
        .single();

      if (!existingRole) {
        // Create role only if it doesn't exist
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: userData.role,
          });

        if (roleError) {
          console.error('Role error:', roleError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao atribuir role: ' + roleError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Role created');
      } else {
        console.log('Role already exists');
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Utilizador criado com sucesso' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else if (action === 'reset-password') {
      console.log('Resetting password for user:', userId);
      
      const newPassword = 'TempPass123!';
      
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        console.error('Password reset error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao redefinir password: ' + error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Password redefinida com sucesso',
          newPassword: newPassword
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
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

  } catch (error) {
    console.error('Error in manage-users function:', error);
    return new Response(
      JSON.stringify({ success: false, error: `Erro interno: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});