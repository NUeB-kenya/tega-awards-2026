import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const users = [
      {
        email: 'collinswafulahkk2030@gmail.com',
        password: '#TEGA2026',
        full_name: 'Judge Tony Stark',
        role: 'judge' as const,
      },
      {
        email: 'collinsw.sunrise@gmail.com',
        password: '#TEGA2026',
        full_name: 'Collins Wafula (Secretariat)',
        role: 'secretariat' as const,
      },
      {
        email: 'collins@sunrisevirtualschool.com',
        password: 'secret',
        full_name: 'Collins Sunrise',
        role: 'submitter' as const,
      },
    ];

    const results = [];

    for (const userData of users) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === userData.email);
      
      if (existing) {
        // Make sure role is set
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', existing.id)
          .eq('role', userData.role)
          .single();

        if (!existingRole) {
          // Delete any existing role
          await supabase.from('user_roles').delete().eq('user_id', existing.id);
          // Insert correct role
          await supabase.from('user_roles').insert({
            user_id: existing.id,
            role: userData.role,
          });
        }

        // Update profile name
        await supabase
          .from('profiles')
          .update({ full_name: userData.full_name })
          .eq('user_id', existing.id);

        results.push({ email: userData.email, status: 'already_exists', role: userData.role });
        continue;
      }

      // Create user with auto-confirm
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: { full_name: userData.full_name },
      });

      if (createError) {
        results.push({ email: userData.email, status: 'error', error: createError.message });
        continue;
      }

      if (newUser?.user) {
        // The trigger will create profile and assign submitter role
        // But we need to override the role for judge/secretariat
        if (userData.role !== 'submitter') {
          // Wait a moment for trigger to fire
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Update role
          await supabase
            .from('user_roles')
            .update({ role: userData.role })
            .eq('user_id', newUser.user.id);
        }

        results.push({ email: userData.email, status: 'created', role: userData.role });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
