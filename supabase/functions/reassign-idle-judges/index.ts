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

    const IDLE_DAYS = 5;
    const cutoff = new Date(Date.now() - IDLE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Find assignments that are pending/in_progress and created more than 5 days ago with no score
    const { data: idleAssignments } = await supabase
      .from('judge_assignments')
      .select('id, judge_id, submission_id, status, created_at')
      .in('status', ['pending', 'in_progress'])
      .lt('created_at', cutoff);

    if (!idleAssignments?.length) {
      return new Response(JSON.stringify({ success: true, reassigned: 0, message: 'No idle assignments found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check which of these actually have scores (if they do, they're not idle)
    const subIds = [...new Set(idleAssignments.map(a => a.submission_id))];
    const judgeIds = [...new Set(idleAssignments.map(a => a.judge_id))];

    const { data: existingScores } = await supabase
      .from('scores')
      .select('judge_id, submission_id')
      .in('submission_id', subIds)
      .in('judge_id', judgeIds);

    const scoredSet = new Set((existingScores || []).map(s => `${s.judge_id}::${s.submission_id}`));

    // Filter to truly idle (no scores submitted at all)
    const trulyIdle = idleAssignments.filter(a => !scoredSet.has(`${a.judge_id}::${a.submission_id}`));

    if (trulyIdle.length === 0) {
      return new Response(JSON.stringify({ success: true, reassigned: 0, message: 'All assigned judges have submitted scores' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get available judges (approved, not at capacity)
    const { data: judgeApps } = await supabase
      .from('judge_applications')
      .select('user_id, expertise_categories')
      .eq('status', 'approved');

    const { data: allAssignments } = await supabase
      .from('judge_assignments')
      .select('judge_id, submission_id')
      .in('status', ['pending', 'in_progress', 'completed']);

    const MAX_PER_JUDGE = 35;
    const judgeLoad: Record<string, number> = {};
    (allAssignments || []).forEach(a => {
      judgeLoad[a.judge_id] = (judgeLoad[a.judge_id] || 0) + 1;
    });

    // Get submissions info for category matching
    const { data: subsData } = await supabase
      .from('submissions')
      .select('id, award_categories, school_country')
      .in('id', subIds);
    const subMap: Record<string, any> = {};
    (subsData || []).forEach(s => { subMap[s.id] = s; });

    let reassignedCount = 0;
    const idleJudgeSet = new Set<string>();

    for (const assignment of trulyIdle) {
      const sub = subMap[assignment.submission_id];
      if (!sub) continue;

      // Find a replacement judge (not the same judge, not at capacity, has category overlap)
      const subCats = sub.award_categories || [];
      const candidates = (judgeApps || []).filter(j => {
        if (j.user_id === assignment.judge_id) return false;
        if ((judgeLoad[j.user_id] || 0) >= MAX_PER_JUDGE) return false;
        const overlap = (j.expertise_categories || []).filter((c: string) => subCats.includes(c));
        return overlap.length > 0;
      });

      if (candidates.length === 0) continue;

      // Pick the least-loaded candidate
      candidates.sort((a, b) => (judgeLoad[a.user_id] || 0) - (judgeLoad[b.user_id] || 0));
      const newJudge = candidates[0];

      // Remove old assignment
      await supabase.from('judge_assignments').delete().eq('id', assignment.id);

      // Create new assignment
      await supabase.from('judge_assignments').insert({
        judge_id: newJudge.user_id,
        submission_id: assignment.submission_id,
        status: 'pending',
      });

      judgeLoad[newJudge.user_id] = (judgeLoad[newJudge.user_id] || 0) + 1;
      idleJudgeSet.add(assignment.judge_id);

      // Notify new judge
      await supabase.from('notifications').insert({
        user_id: newJudge.user_id,
        title: '📋 New Submission Reassigned to You',
        message: `A submission for ${sub.school_country || 'a school'} has been reassigned to you for evaluation. Please log in to begin your review.`,
        type: 'info',
        link: '/judge/submissions',
      });

      reassignedCount++;
    }

    // Notify idle judges
    for (const judgeId of idleJudgeSet) {
      await supabase.from('notifications').insert({
        user_id: judgeId,
        title: '⚠️ Submissions Reassigned Due to Inactivity',
        message: `Some of your assigned submissions have been reassigned to other judges because no scoring activity was detected within ${IDLE_DAYS} days.`,
        type: 'warning',
      });
    }

    return new Response(JSON.stringify({
      success: true,
      reassigned: reassignedCount,
      idleJudges: idleJudgeSet.size,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reassign idle judges error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
