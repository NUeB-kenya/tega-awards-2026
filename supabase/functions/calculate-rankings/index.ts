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

    // Fetch all scored/winner submissions
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, school_country, country_id, region, award_categories, category_id, stage, status')
      .in('status', ['scored', 'winner']);

    // Fetch ALL scores
    const { data: allScores } = await supabase
      .from('scores')
      .select('submission_id, overall_score, impact_score, innovation_score, criterion_evidence, criterion_ethics, category_name');

    if (!submissions?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No scored submissions to rank' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Country/region/continent mapping
    const { data: countries } = await supabase.from('countries').select('id, name, region_id');
    const { data: regions } = await supabase.from('regions').select('id, name');

    const regionMap: Record<string, string> = {};
    regions?.forEach(r => { regionMap[r.id] = r.name; });

    const countryRegionMap: Record<string, string> = {};
    const countryContinentMap: Record<string, string> = {};
    countries?.forEach(c => {
      countryRegionMap[c.id] = c.region_id || '';
      const rName = regionMap[c.region_id || ''] || '';
      if (rName.includes('Africa')) countryContinentMap[c.id] = 'Africa';
      else if (rName.includes('Europe')) countryContinentMap[c.id] = 'Europe';
      else if (rName.includes('Asia') || rName.includes('Pacific')) countryContinentMap[c.id] = 'Asia-Pacific';
      else if (rName.includes('America') || rName.includes('Caribbean')) countryContinentMap[c.id] = 'Americas';
      else if (rName.includes('Middle East')) countryContinentMap[c.id] = 'Middle East';
      else countryContinentMap[c.id] = 'Other';
    });

    // Build AGGREGATED score entries per submission per category
    // Key fix: average across all judges for same submission+category
    type RankEntry = {
      submission_id: string;
      category_id: number | null;
      category_name: string;
      country_id: string | null;
      region: string | null;
      continent: string | null;
      final_score: number;
      country_rank?: number;
      continental_rank?: number;
      regional_rank?: number;
      global_rank?: number;
      tier_level?: string;
    };

    const entries: RankEntry[] = [];

    for (const sub of submissions) {
      const subScores = (allScores || []).filter(s => s.submission_id === sub.id);
      if (subScores.length === 0) continue;

      const categories = sub.award_categories || [];

      for (const catName of categories) {
        // Get all judge scores for this submission+category
        const catScores = subScores.filter(s => s.category_name === catName);
        // If no category-specific scores, use all scores as fallback
        const scoresToUse = catScores.length > 0 ? catScores : subScores;

        // AGGREGATE: average across all judges
        const judgeAvg = scoresToUse.reduce((a, s) => a + (s.overall_score || 0), 0) / scoresToUse.length;
        const impactAvg = scoresToUse.reduce((a, s) => a + (s.impact_score || 0), 0) / scoresToUse.length;
        const innovationAvg = scoresToUse.reduce((a, s) => a + (s.innovation_score || 0), 0) / scoresToUse.length;
        const evidenceAvg = scoresToUse.reduce((a, s) => a + (s.criterion_evidence || 0), 0) / scoresToUse.length;

        const integrityScore = 85; // Default
        const finalScore = (
          (judgeAvg * 0.40) +
          (impactAvg * 10 * 0.20) +
          (integrityScore * 0.15) +
          (innovationAvg * 10 * 0.15) +
          (evidenceAvg * 10 * 0.10)
        );

        // Only rank if we have a meaningful score
        if (finalScore <= 0) continue;

        entries.push({
          submission_id: sub.id,
          category_id: sub.category_id,
          category_name: catName,
          country_id: sub.country_id,
          region: sub.region || countryRegionMap[sub.country_id || ''] || null,
          continent: countryContinentMap[sub.country_id || ''] || null,
          final_score: Math.round(finalScore * 100) / 100,
        });
      }
    }

    // Clear existing rankings
    await supabase.from('application_rankings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (entries.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No valid scores to rank', ranked: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rank by country per category
    const byCountryCategory: Record<string, RankEntry[]> = {};
    entries.forEach(e => {
      const key = `${e.country_id}::${e.category_name}`;
      if (!byCountryCategory[key]) byCountryCategory[key] = [];
      byCountryCategory[key].push(e);
    });
    Object.values(byCountryCategory).forEach(group => {
      group.sort((a, b) => b.final_score - a.final_score);
      group.forEach((e, i) => { e.country_rank = i + 1; });
    });

    // Continental: use country top 3
    const byContinentCategory: Record<string, RankEntry[]> = {};
    entries.filter(e => (e.country_rank || 999) <= 3).forEach(e => {
      const key = `${e.continent}::${e.category_name}`;
      if (!byContinentCategory[key]) byContinentCategory[key] = [];
      byContinentCategory[key].push(e);
    });
    Object.values(byContinentCategory).forEach(group => {
      group.sort((a, b) => b.final_score - a.final_score);
      group.forEach((e, i) => { e.continental_rank = i + 1; });
    });

    // Regional: use continental top 3
    const byRegionCategory: Record<string, RankEntry[]> = {};
    entries.filter(e => e.continental_rank && e.continental_rank <= 3).forEach(e => {
      const key = `${e.region}::${e.category_name}`;
      if (!byRegionCategory[key]) byRegionCategory[key] = [];
      byRegionCategory[key].push(e);
    });
    Object.values(byRegionCategory).forEach(group => {
      group.sort((a, b) => b.final_score - a.final_score);
      group.forEach((e, i) => { e.regional_rank = i + 1; });
    });

    // Global: use regional top 3
    const byGlobalCategory: Record<string, RankEntry[]> = {};
    entries.filter(e => e.regional_rank && e.regional_rank <= 3).forEach(e => {
      const key = e.category_name;
      if (!byGlobalCategory[key]) byGlobalCategory[key] = [];
      byGlobalCategory[key].push(e);
    });
    Object.values(byGlobalCategory).forEach(group => {
      group.sort((a, b) => b.final_score - a.final_score);
      group.forEach((e, i) => { e.global_rank = i + 1; });
    });

    // Compute tier levels
    entries.forEach(e => {
      const rank = e.global_rank || e.regional_rank || e.continental_rank || e.country_rank || 999;
      if (rank <= 3) e.tier_level = 'gold';
      else if (rank <= 10) e.tier_level = 'silver';
      else if (rank <= 24) e.tier_level = 'bronze';
      else e.tier_level = 'unranked';
    });

    // Insert rankings
    const inserts = entries.map(e => ({
      submission_id: e.submission_id,
      category_id: e.category_id,
      final_score: e.final_score,
      country_id: e.country_id,
      region_id: e.region,
      continent: e.continent,
      country_rank: e.country_rank || null,
      continental_rank: e.continental_rank || null,
      regional_rank: e.regional_rank || null,
      global_rank: e.global_rank || null,
      tier_level: e.tier_level || 'unranked',
    }));

    for (let i = 0; i < inserts.length; i += 50) {
      await supabase.from('application_rankings').insert(inserts.slice(i, i + 50));
    }

    return new Response(JSON.stringify({
      success: true,
      ranked: entries.length,
      summary: {
        gold: entries.filter(e => e.tier_level === 'gold').length,
        silver: entries.filter(e => e.tier_level === 'silver').length,
        bronze: entries.filter(e => e.tier_level === 'bronze').length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Ranking error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
