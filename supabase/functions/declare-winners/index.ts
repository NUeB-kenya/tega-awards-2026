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

    const { submission_ids, stage } = await req.json();

    if (!submission_ids || !Array.isArray(submission_ids) || submission_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'No submission IDs provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let declared = 0;
    const errors: string[] = [];

    for (const subId of submission_ids) {
      // Get submission details
      const { data: sub, error: subErr } = await supabase
        .from('submissions')
        .select('id, submitter_id, school_name, school_country, stage, status, award_categories')
        .eq('id', subId)
        .single();

      if (subErr || !sub) {
        errors.push(`Submission ${subId} not found`);
        continue;
      }

      // Update status to winner
      const { error: updateErr } = await supabase
        .from('submissions')
        .update({ status: 'winner' })
        .eq('id', subId);

      if (updateErr) {
        errors.push(`Failed to update ${subId}: ${updateErr.message}`);
        continue;
      }

      // Get submitter profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', sub.submitter_id)
        .single();

      const stageLabel = (sub.stage || 'national').charAt(0).toUpperCase() + (sub.stage || 'national').slice(1);
      const categories = (sub.award_categories || []).join(', ') || 'General';

      // In-app notification — specific to this winner's categories
      await supabase.from('notifications').insert({
        user_id: sub.submitter_id,
        title: `🏆 Congratulations — ${stageLabel} Winner!`,
        message: `We are delighted to announce that ${sub.school_name} (${sub.school_country}) has been officially declared a ${stageLabel} Winner of the TEGA Awards in the following ${(sub.award_categories || []).length > 1 ? 'categories' : 'category'}:\n\n${(sub.award_categories || []).map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}\n\nThis is a remarkable achievement that recognizes your institution's exceptional contribution to education transformation.\n\nPlease log in to your dashboard for more details about the awards ceremony and next steps.`,
        type: 'success',
        link: '/dashboard',
      });

      // Send notification email
      if (profile?.email) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              submissionId: sub.id,
              status: 'winner',
              userId: sub.submitter_id,
            },
          });
        } catch (emailErr) {
          console.error(`Email failed for ${sub.id}:`, emailErr);
        }
      }

      declared++;
    }

    return new Response(JSON.stringify({
      success: true,
      declared,
      errors: errors.length > 0 ? errors : undefined,
      stage: stage || 'unknown',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Declare winners error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
