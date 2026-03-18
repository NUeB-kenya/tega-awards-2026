import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get admin/secretariat/super_admin user IDs to keep
    const { data: keepRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['secretariat', 'admin', 'super_admin']);

    const keepIds = new Set((keepRoles || []).map(r => r.user_id));

    // List all auth users and delete non-admin ones
    const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const toDelete = (allUsers?.users || []).filter(u => !keepIds.has(u.id));

    const results = [];
    for (const user of toDelete) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      results.push({ id: user.id, email: user.email, error: error?.message || null });
    }

    return new Response(JSON.stringify({ 
      kept: keepIds.size, 
      deleted: results.filter(r => !r.error).length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
