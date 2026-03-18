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

    // Fetch all scored/winner/finalist submissions
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, school_name, school_country, school_city, submitter_id, nominator_name, nominator_email, nominator_phone, nominator_role, institution_type, institution_size, nomination_statement, nomination_statements, award_categories, category_id, country_id, region, stage, status, parent_submission_id, average_score');

    const { data: allScores } = await supabase
      .from('scores')
      .select('submission_id, overall_score, impact_score, innovation_score, criterion_evidence, criterion_ethics, category_name');

    // Fetch geography
    const { data: countries } = await supabase.from('countries').select('id, name, region_id');
    const { data: regions } = await supabase.from('regions').select('id, name');

    // Build lookup maps
    const regionMap: Record<string, string> = {};
    regions?.forEach(r => { regionMap[r.id] = r.name; });

    // country_id → region name
    const countryToRegionName: Record<string, string> = {};
    // country_id → region_id
    const countryToRegionId: Record<string, string> = {};
    // country_id → continent name
    const countryToContinentName: Record<string, string> = {};
    // country name → country_id (for matching by school_country)
    const countryNameToId: Record<string, string> = {};

    countries?.forEach(c => {
      countryNameToId[c.name.toLowerCase()] = c.id;
      countryToRegionId[c.id] = c.region_id || '';
      const rName = regionMap[c.region_id || ''] || '';
      countryToRegionName[c.id] = rName;

      if (rName.includes('Africa') && rName.includes('East')) countryToContinentName[c.id] = 'Africa';
      else if (rName.includes('Africa') && rName.includes('West')) countryToContinentName[c.id] = 'Africa';
      else if (rName.includes('Africa') && rName.includes('South')) countryToContinentName[c.id] = 'Africa';
      else if (rName.includes('Africa') && rName.includes('North')) countryToContinentName[c.id] = 'Africa';
      else if (rName.includes('Africa') && rName.includes('Central')) countryToContinentName[c.id] = 'Africa';
      else if (rName.includes('Africa')) countryToContinentName[c.id] = 'Africa';
      else if (rName.includes('Europe')) countryToContinentName[c.id] = 'Europe';
      else if (rName.includes('Asia') || rName.includes('Pacific')) countryToContinentName[c.id] = 'Asia-Pacific';
      else if (rName.includes('America') || rName.includes('Caribbean')) countryToContinentName[c.id] = 'Americas';
      else if (rName.includes('Middle East')) countryToContinentName[c.id] = 'Middle East';
      else countryToContinentName[c.id] = 'Other';
    });

    // Helper: resolve country_id from submission
    const resolveCountryId = (sub: any): string | null => {
      if (sub.country_id) return sub.country_id;
      if (sub.school_country) {
        const found = countryNameToId[sub.school_country.toLowerCase()];
        if (found) return found;
      }
      return null;
    };

    // Helper: resolve region name from country_id
    const resolveRegionName = (countryId: string | null): string => {
      if (!countryId) return 'Unknown Region';
      return countryToRegionName[countryId] || 'Unknown Region';
    };

    const resolveContinentName = (countryId: string | null): string => {
      if (!countryId) return 'Unknown';
      return countryToContinentName[countryId] || 'Unknown';
    };

    // --- FIRST: Backfill missing region on all submissions that have a country_id ---
    const allSubs = submissions || [];
    for (const sub of allSubs) {
      const cid = resolveCountryId(sub);
      const regionName = resolveRegionName(cid);
      const needsUpdate = (!sub.region && cid) || (!sub.country_id && cid);
      if (needsUpdate) {
        const updates: Record<string, any> = {};
        if (!sub.region) updates.region = regionName;
        if (!sub.country_id && cid) updates.country_id = cid;
        if (Object.keys(updates).length > 0) {
          await supabase.from('submissions').update(updates).eq('id', sub.id);
          // Update local copy too
          if (updates.region) sub.region = updates.region;
          if (updates.country_id) sub.country_id = updates.country_id;
        }
      }
    }

    const scoredSubs = allSubs.filter(s => ['scored', 'winner', 'finalist'].includes(s.status));

    if (!scoredSubs.length) {
      return new Response(JSON.stringify({ success: true, message: 'No scored submissions to rank', ranked: 0, promoted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build aggregated score entries per submission per category
    type RankEntry = {
      submission_id: string;
      category_id: number | null;
      category_name: string;
      country_id: string | null;
      region: string | null;
      continent: string | null;
      stage: string;
      final_score: number;
      country_rank?: number;
      regional_rank?: number;
      continental_rank?: number;
      global_rank?: number;
      tier_level?: string;
    };

    const entries: RankEntry[] = [];

    for (const sub of scoredSubs) {
      const subScores = (allScores || []).filter(s => s.submission_id === sub.id);
      if (subScores.length === 0) continue;

      const cid = resolveCountryId(sub);
      const regionName = resolveRegionName(cid);
      const continentName = resolveContinentName(cid);

      const categories = sub.award_categories || [];
      if (categories.length === 0) categories.push('General');

      for (const catName of categories) {
        const catScores = subScores.filter(s => s.category_name === catName);
        const scoresToUse = catScores.length > 0 ? catScores : subScores;

        const judgeAvg = scoresToUse.reduce((a, s) => a + (s.overall_score || 0), 0) / scoresToUse.length;
        const impactAvg = scoresToUse.reduce((a, s) => a + (s.impact_score || 0), 0) / scoresToUse.length;
        const innovationAvg = scoresToUse.reduce((a, s) => a + (s.innovation_score || 0), 0) / scoresToUse.length;
        const evidenceAvg = scoresToUse.reduce((a, s) => a + (s.criterion_evidence || 0), 0) / scoresToUse.length;

        const integrityScore = 85;
        const finalScore = (
          (judgeAvg * 0.40) +
          (impactAvg * 10 * 0.20) +
          (integrityScore * 0.15) +
          (innovationAvg * 10 * 0.15) +
          (evidenceAvg * 10 * 0.10)
        );

        if (finalScore <= 0) continue;
        // Only entries with score >= 80 get ranked; below 80 still stored but unranked

        entries.push({
          submission_id: sub.id,
          category_id: sub.category_id,
          category_name: catName,
          country_id: cid,
          region: regionName,
          continent: continentName,
          stage: sub.stage || 'national',
          final_score: Math.round(finalScore * 100) / 100,
        });
      }
    }

    // Clear existing rankings
    await supabase.from('application_rankings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (entries.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No valid scores to rank', ranked: 0, promoted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== RANKING HIERARCHY: National → Regional → Continental → Global =====
    const PASSMARK = 80;
    const rankableEntries = entries.filter(e => e.final_score >= PASSMARK);
    const belowPassmark = entries.filter(e => e.final_score < PASSMARK);

    // 1. COUNTRY RANK: per country+category, highest score = rank 1 (only ≥80)
    const byCountryCategory: Record<string, RankEntry[]> = {};
    rankableEntries.forEach(e => {
      const key = `${e.country_id}::${e.category_name}`;
      if (!byCountryCategory[key]) byCountryCategory[key] = [];
      byCountryCategory[key].push(e);
    });
    Object.values(byCountryCategory).forEach(group => {
      group.sort((a, b) => b.final_score - a.final_score);
      group.forEach((e, i) => { e.country_rank = i + 1; });
    });

    // 2. REGIONAL RANK: Country top 3 → grouped by region+category, highest score = rank 1
    const byRegionCategory: Record<string, RankEntry[]> = {};
    rankableEntries.filter(e => (e.country_rank || 999) <= 3).forEach(e => {
      const key = `${e.region}::${e.category_name}`;
      if (!byRegionCategory[key]) byRegionCategory[key] = [];
      byRegionCategory[key].push(e);
    });
    Object.values(byRegionCategory).forEach(group => {
      group.sort((a, b) => b.final_score - a.final_score);
      group.forEach((e, i) => { e.regional_rank = i + 1; });
    });

    // 3. CONTINENTAL RANK: Regional top 50 → grouped by continent+category, highest score = rank 1
    const byContinentCategory: Record<string, RankEntry[]> = {};
    entries.filter(e => e.regional_rank != null && e.regional_rank <= 50).forEach(e => {
      const key = `${e.continent}::${e.category_name}`;
      if (!byContinentCategory[key]) byContinentCategory[key] = [];
      byContinentCategory[key].push(e);
    });
    Object.values(byContinentCategory).forEach(group => {
      group.sort((a, b) => b.final_score - a.final_score);
      group.forEach((e, i) => { e.continental_rank = i + 1; });
    });

    // 4. GLOBAL RANK: Continental top 100 → all in one pool per category, highest score = rank 1
    const byGlobalCategory: Record<string, RankEntry[]> = {};
    entries.filter(e => e.continental_rank != null && e.continental_rank <= 100).forEach(e => {
      const key = e.category_name;
      if (!byGlobalCategory[key]) byGlobalCategory[key] = [];
      byGlobalCategory[key].push(e);
    });
    Object.values(byGlobalCategory).forEach(group => {
      group.sort((a, b) => b.final_score - a.final_score);
      group.forEach((e, i) => { e.global_rank = i + 1; });
    });

    // Tier levels based on global rank
    entries.forEach(e => {
      const rank = e.global_rank || e.continental_rank || e.regional_rank || e.country_rank || 999;
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
      regional_rank: e.regional_rank || null,
      continental_rank: e.continental_rank || null,
      global_rank: e.global_rank || null,
      tier_level: e.tier_level || 'unranked',
    }));

    for (let i = 0; i < inserts.length; i += 50) {
      await supabase.from('application_rankings').insert(inserts.slice(i, i + 50));
    }

    // ===== AUTO-PROMOTION: National → Regional → Continental → Global =====
    let promotedCount = 0;
    const subMap = Object.fromEntries(allSubs.map(s => [s.id, s]));

    const stagePromotions: { fromStage: string; toStage: string; rankField: keyof RankEntry; topN: number }[] = [
      { fromStage: 'national', toStage: 'regional', rankField: 'country_rank', topN: 3 },
      { fromStage: 'regional', toStage: 'continental', rankField: 'regional_rank', topN: 50 },
      { fromStage: 'continental', toStage: 'global', rankField: 'continental_rank', topN: 100 },
    ];

    for (const promo of stagePromotions) {
      const eligible = entries.filter(e => {
        const sub = subMap[e.submission_id];
        if (!sub) return false;
        const rank = e[promo.rankField] as number | undefined;
        return sub.stage === promo.fromStage && sub.status === 'scored' && rank != null && rank <= promo.topN;
      });

      const seen = new Set<string>();
      for (const entry of eligible) {
        if (seen.has(entry.submission_id)) continue;
        seen.add(entry.submission_id);

        const sub = subMap[entry.submission_id];
        if (!sub) continue;

        // Check if already promoted
        const existing = allSubs.find(s => s.parent_submission_id === sub.id && s.stage === promo.toStage);
        if (existing) continue;

        const cid = resolveCountryId(sub);
        const regionName = resolveRegionName(cid);

        // Calculate parent avg score to carry forward
        const parentScores = (allScores || []).filter(s => s.submission_id === sub.id);
        const parentAvg = parentScores.length > 0
          ? Math.round(parentScores.reduce((a, s) => a + (s.overall_score || 0), 0) / parentScores.length * 100) / 100
          : sub.average_score || null;

        const { error } = await supabase.from('submissions').insert({
          submitter_id: sub.submitter_id,
          nominator_name: sub.nominator_name,
          nominator_email: sub.nominator_email,
          nominator_phone: sub.nominator_phone,
          nominator_role: sub.nominator_role,
          school_name: sub.school_name,
          school_city: sub.school_city,
          school_country: sub.school_country,
          institution_type: sub.institution_type,
          institution_size: sub.institution_size,
          nomination_statement: sub.nomination_statement,
          nomination_statements: sub.nomination_statements,
          award_categories: sub.award_categories,
          category_id: sub.category_id,
          country_id: cid,
          region: regionName,
          stage: promo.toStage,
          status: 'submitted',
          approval_status: 'pending',
          parent_submission_id: sub.id,
          promoted_from_stage: promo.fromStage,
          average_score: parentAvg,
        });

        if (!error) {
          await supabase.from('submissions').update({ status: 'winner' }).eq('id', sub.id);
          
          await supabase.from('notifications').insert({
            user_id: sub.submitter_id,
            title: `🏆 ${promo.fromStage.charAt(0).toUpperCase() + promo.fromStage.slice(1)} Winner — Promoted to ${promo.toStage.charAt(0).toUpperCase() + promo.toStage.slice(1)}!`,
            message: `Congratulations! ${sub.school_name} ranked in the Top ${promo.topN} at the ${promo.fromStage} level and has been automatically promoted to the ${promo.toStage} stage.`,
            type: 'success',
          });
          
          promotedCount++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      ranked: entries.length,
      promoted: promotedCount,
      summary: {
        national: entries.filter(e => e.country_rank != null).length,
        regional: entries.filter(e => e.regional_rank != null).length,
        continental: entries.filter(e => e.continental_rank != null).length,
        global: entries.filter(e => e.global_rank != null).length,
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
