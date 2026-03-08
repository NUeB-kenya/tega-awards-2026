import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete related data in order (respecting foreign keys)
    // 1. Scores by this user (as judge)
    await supabase.from('scores').delete().eq('judge_id', user_id);

    // 2. Judge assignments
    await supabase.from('judge_assignments').delete().eq('judge_id', user_id);

    // 3. Panel judges
    await supabase.from('panel_judges').delete().eq('judge_id', user_id);

    // 4. Conflict declarations
    await supabase.from('conflict_declarations').delete().eq('judge_id', user_id);

    // 5. Judge applications
    await supabase.from('judge_applications').delete().eq('user_id', user_id);

    // 6. Notifications
    await supabase.from('notifications').delete().eq('user_id', user_id);

    // 7. Submissions and related (evidence_files, submission_documents, payments, scores on their submissions, rankings)
    const { data: subs } = await supabase.from('submissions').select('id').eq('submitter_id', user_id);
    if (subs && subs.length > 0) {
      const subIds = subs.map(s => s.id);
      await supabase.from('application_rankings').delete().in('submission_id', subIds);
      await supabase.from('scores').delete().in('submission_id', subIds);
      await supabase.from('evidence_files').delete().in('submission_id', subIds);
      await supabase.from('submission_documents').delete().in('submission_id', subIds);
      await supabase.from('payments').delete().in('submission_id', subIds);
      await supabase.from('judge_assignments').delete().in('submission_id', subIds);
      // Handle child submissions (promoted ones)
      await supabase.from('submissions').delete().in('parent_submission_id', subIds);
      await supabase.from('submissions').delete().eq('submitter_id', user_id);
    }

    // 8. User roles
    await supabase.from('user_roles').delete().eq('user_id', user_id);

    // 9. Profile
    await supabase.from('profiles').delete().eq('user_id', user_id);

    // 10. Delete from auth.users (service role required)
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id);
    if (authError) {
      console.error('Auth delete error:', authError);
      return new Response(JSON.stringify({ error: `Failed to delete auth user: ${authError.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, deleted_user_id: user_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
