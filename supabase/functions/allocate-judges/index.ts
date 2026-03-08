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

    const MAX_PER_JUDGE = 35;
    const MIN_JUDGES_PER_SUBMISSION = 3;

    // Get screened submissions needing judges
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, award_categories, school_country, country_id, nomination_statement')
      .eq('status', 'screened');

    // Get approved judges with expertise
    const { data: judgeApps } = await supabase
      .from('judge_applications')
      .select('user_id, expertise_categories, full_name')
      .eq('status', 'approved');

    // Get existing assignments to check load
    const { data: existingAssignments } = await supabase
      .from('judge_assignments')
      .select('judge_id, submission_id');

    if (!submissions?.length || !judgeApps?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No submissions or judges available', assigned: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build judge load map
    const judgeLoad: Record<string, number> = {};
    const assignmentSet = new Set<string>(); // "judgeId::subId"
    (existingAssignments || []).forEach(a => {
      judgeLoad[a.judge_id] = (judgeLoad[a.judge_id] || 0) + 1;
      assignmentSet.add(`${a.judge_id}::${a.submission_id}`);
    });

    // Get judge countries for COI
    const judgeIds = judgeApps.map(j => j.user_id);
    const { data: judgeProfiles } = await supabase
      .from('profiles')
      .select('user_id, country')
      .in('user_id', judgeIds);
    const judgeCountryMap: Record<string, string> = {};
    judgeProfiles?.forEach(p => { judgeCountryMap[p.user_id] = p.country || ''; });

    // Get COI declarations
    const { data: conflicts } = await supabase
      .from('conflict_declarations')
      .select('judge_id, submission_id');
    const conflictSet = new Set<string>();
    conflicts?.forEach(c => { conflictSet.add(`${c.judge_id}::${c.submission_id}`); });

    let totalAssigned = 0;
    const newAssignments: { judge_id: string; submission_id: string; status: string }[] = [];

    for (const sub of submissions) {
      const subCategories = sub.award_categories || [];
      const existingJudgesForSub = (existingAssignments || [])
        .filter(a => a.submission_id === sub.id)
        .map(a => a.judge_id);

      const needed = MIN_JUDGES_PER_SUBMISSION - existingJudgesForSub.length;
      if (needed <= 0) continue;

      // Score each judge for this submission
      type JudgeScore = { userId: string; score: number };
      const scored: JudgeScore[] = [];

      for (const judge of judgeApps) {
        // Skip if already assigned or at capacity
        if (assignmentSet.has(`${judge.user_id}::${sub.id}`)) continue;
        if ((judgeLoad[judge.user_id] || 0) >= MAX_PER_JUDGE) continue;
        // Skip if COI
        if (conflictSet.has(`${judge.user_id}::${sub.id}`)) continue;
        // Skip same-country judges (basic COI)
        if (judgeCountryMap[judge.user_id] === sub.school_country) continue;

        const judgeCategories = judge.expertise_categories || [];
        
        // Category overlap score (40%)
        const overlap = subCategories.filter((c: string) => judgeCategories.includes(c)).length;
        const categoryScore = subCategories.length > 0 ? (overlap / subCategories.length) * 100 : 0;
        
        // Must have at least 1 category overlap
        if (overlap === 0) continue;

        // Load balancing score (25%) - prefer less loaded judges
        const loadScore = Math.max(0, 100 - ((judgeLoad[judge.user_id] || 0) / MAX_PER_JUDGE) * 100);

        // Expertise breadth (20%) - more categories = more versatile
        const breadthScore = Math.min(100, (judgeCategories.length / 14) * 100);

        // Diversity bonus (15%) - prefer judges from different countries than already assigned
        const existingCountries = existingJudgesForSub.map(jid => judgeCountryMap[jid]);
        const diversityScore = existingCountries.includes(judgeCountryMap[judge.user_id]) ? 30 : 100;

        const totalScore = (categoryScore * 0.40) + (loadScore * 0.25) + (breadthScore * 0.20) + (diversityScore * 0.15);
        scored.push({ userId: judge.user_id, score: totalScore });
      }

      // Sort by score descending, take top N
      scored.sort((a, b) => b.score - a.score);
      const toAssign = scored.slice(0, needed);

      for (const j of toAssign) {
        newAssignments.push({ judge_id: j.userId, submission_id: sub.id, status: 'pending' });
        judgeLoad[j.userId] = (judgeLoad[j.userId] || 0) + 1;
        assignmentSet.add(`${j.userId}::${sub.id}`);
        totalAssigned++;
      }
    }

    // Batch insert assignments
    if (newAssignments.length > 0) {
      for (let i = 0; i < newAssignments.length; i += 50) {
        await supabase.from('judge_assignments').insert(newAssignments.slice(i, i + 50));
      }

      // Update submission status to 'assigned'
      const assignedSubIds = [...new Set(newAssignments.map(a => a.submission_id))];
      for (const subId of assignedSubIds) {
        await supabase.from('submissions').update({ status: 'assigned' }).eq('id', subId);
      }

      // Notify judges
      const judgeSubMap: Record<string, number> = {};
      newAssignments.forEach(a => { judgeSubMap[a.judge_id] = (judgeSubMap[a.judge_id] || 0) + 1; });
      for (const [judgeId, count] of Object.entries(judgeSubMap)) {
        await supabase.from('notifications').insert({
          user_id: judgeId,
          title: `📋 ${count} New Submission${count > 1 ? 's' : ''} Assigned`,
          message: `You have been assigned ${count} new submission${count > 1 ? 's' : ''} to evaluate. Please log in to begin your review.`,
          type: 'info',
          link: '/judge/submissions',
        });
      }
    }

    // Check for under-covered categories
    const categoryCoverage: Record<string, number> = {};
    judgeApps.forEach(j => {
      (j.expertise_categories || []).forEach((c: string) => {
        categoryCoverage[c] = (categoryCoverage[c] || 0) + 1;
      });
    });
    const underCovered = Object.entries(categoryCoverage)
      .filter(([_, count]) => count < 7)
      .map(([cat, count]) => ({ category: cat, judges: count }));

    return new Response(JSON.stringify({
      success: true,
      assigned: totalAssigned,
      underCoveredCategories: underCovered,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Judge allocation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
