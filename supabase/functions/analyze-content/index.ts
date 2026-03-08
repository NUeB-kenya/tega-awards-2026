import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { submissionId, statements, documentUrls } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch other submissions for cross-comparison
    const { data: otherSubs } = await supabase
      .from('submissions')
      .select('id, nomination_statement, nomination_statements, school_name, award_categories')
      .neq('id', submissionId || '')
      .not('nomination_statement', 'is', null)
      .limit(50);

    const existingTexts = (otherSubs || []).map(s => ({
      id: s.id, school: s.school_name,
      text: s.nomination_statement,
      statements: s.nomination_statements || {},
    }));

    // Build combined analysis prompt
    const allStatements = Object.entries(statements as Record<string, string>)
      .filter(([_, v]) => v && v.length > 30)
      .map(([cat, text]) => `[Category: ${cat}]\n${text}`)
      .join('\n\n---\n\n');

    if (!allStatements) {
      return new Response(JSON.stringify({ success: true, results: {}, flagged: false, integrityScore: 100 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch document metadata if available
    let documentContext = '';
    if (submissionId) {
      const { data: docs } = await supabase
        .from('submission_documents')
        .select('file_name, category, file_size, mime_type, created_at')
        .eq('submission_id', submissionId);
      
      if (docs?.length) {
        documentContext = '\n\nUPLOADED DOCUMENTS:\n' + docs.map(d => 
          `- ${d.file_name} (${d.category}, ${d.mime_type}, ${d.file_size ? Math.round(d.file_size / 1024) + 'KB' : 'unknown size'}, uploaded: ${d.created_at})`
        ).join('\n');
      }
    }

    const crossComparisonExcerpts = existingTexts.slice(0, 20).map(s => {
      const stmts = typeof s.statements === 'object' ? Object.values(s.statements).join(' ') : '';
      return `[${s.school}]: ${(s.text + ' ' + stmts).substring(0, 300)}`;
    }).join('\n');

    const systemPrompt = `You are an advanced Submission Integrity Analyzer for the TEGA (Transforming Education Global Awards) platform. You perform comprehensive multi-layer analysis.

ANALYSIS LAYERS:

1. PLAGIARISM & AI CONTENT DETECTION (30% weight)
- Check for AI-generated content patterns: overly even sentence structure, low semantic entropy, repetitive phrasing
- Look for boilerplate/generic text lacking specificity
- Check for inconsistent writing style or tone shifts
- Assess buzzword density ("transformative ecosystem", "holistic paradigm", "future-ready synergy")
- If AI probability > 70%, flag: "Possible AI-generated narrative. Human verification recommended."
- Similarity thresholds: 20-40% = review, 40-60% = high risk, 60%+ = integrity alert

2. IMPACT CLAIM VERIFICATION (25% weight)
- Analyze numerical claims for plausibility
- Check if improvement percentages match provided context
- Flag inconsistencies between sections (e.g. "500 students" vs "1200 beneficiaries")
- Flag unverified scale claims (e.g. "100 schools in 6 months" with no evidence)
- Check growth logic and timeline feasibility

3. DOCUMENT & CONTENT AUTHENTICITY (20% weight)
- Check for fabricated testimonial patterns (same writing style as applicant)
- Check for citation fabrication (invented references)
- Flag identical language patterns suggesting self-generated endorsements
- Check for template/copied submission structure
- Analyze document metadata if provided (creation timing, file patterns)
- Flag if multiple documents appear to be from same author/template
- Check for stock image indicators in document names

4. CROSS-SUBMISSION SIMILARITY (15% weight)
- Compare against other submissions provided below
- Flag if similarity > 75% with any other submission
- Detect shared narratives, project descriptions, or recycled content

5. EVIDENCE QUALITY & OCR ANALYSIS (10% weight)
- Calculate evidence density: measurable claims vs proof references
- Flag low evidence density (many claims, few supporting details)
- Check for vague vs specific impact statements
- Analyze document count and types relative to claims made
- Flag if documents appear insufficient for stated impact scope

${documentContext}

EXISTING SUBMISSIONS FOR COMPARISON:
${crossComparisonExcerpts || 'No other submissions available yet.'}

RESPOND using the tool provided. Generate an integrity score from 0-100 where:
90-100 = clean submission
70-89 = minor flags
50-69 = moderate concern
below 50 = integrity review required`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this submission:\n\n${allStatements}` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'report_integrity_analysis',
            description: 'Report comprehensive integrity analysis results',
            parameters: {
              type: 'object',
              properties: {
                integrity_score: { type: 'number', description: 'Overall integrity score 0-100' },
                plagiarism_score: { type: 'number', description: 'Plagiarism/AI risk score 0-100 (higher=more suspicious)' },
                impact_credibility_score: { type: 'number', description: 'Impact claim credibility 0-100' },
                document_authenticity_score: { type: 'number', description: 'Content authenticity 0-100' },
                cross_similarity_score: { type: 'number', description: 'Cross-submission similarity 0-100 (higher=more suspicious)' },
                evidence_quality_score: { type: 'number', description: 'Evidence quality 0-100' },
                ai_generated_probability: { type: 'number', description: 'Probability content is AI-generated 0-100' },
                buzzword_density: { type: 'string', enum: ['low', 'moderate', 'high', 'excessive'] },
                document_flags: { type: 'array', items: { type: 'string' }, description: 'Document-specific flags (template reuse, timing, metadata)' },
                citation_issues: { type: 'array', items: { type: 'string' }, description: 'Flagged citation/reference issues' },
                flags: { type: 'array', items: { type: 'string' }, description: 'List of detected issues (max 10)' },
                recommendations: { type: 'array', items: { type: 'string' }, description: 'Recommendations for judges (max 5)' },
                category_results: {
                  type: 'object',
                  description: 'Per-category analysis',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      score: { type: 'number' },
                      flags: { type: 'array', items: { type: 'string' } },
                      recommendation: { type: 'string', enum: ['pass', 'review', 'alert'] },
                    },
                  },
                },
                overall_recommendation: { type: 'string', enum: ['pass', 'review', 'alert'] },
                confidence_level: { type: 'string', enum: ['low', 'medium', 'high'] },
              },
              required: ['integrity_score', 'plagiarism_score', 'impact_credibility_score', 'flags', 'overall_recommendation', 'confidence_level', 'ai_generated_probability'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'report_integrity_analysis' } },
      }),
    });

    let analysis: any = { integrity_score: 85, flags: [], overall_recommendation: 'pass', confidence_level: 'low' };

    if (response.ok) {
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        analysis = JSON.parse(toolCall.function.arguments);
      }
    } else {
      const errStatus = response.status;
      const errText = await response.text();
      console.error('AI gateway error:', errStatus, errText);
      if (errStatus === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again later.', success: false }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (errStatus === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.', success: false }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build screening notes summary
    const flagSummary = (analysis.flags || []).slice(0, 5).join('; ');
    const docFlags = (analysis.document_flags || []).slice(0, 3).join('; ');
    const screeningNotes = [
      `AI Integrity Score: ${analysis.integrity_score}/100`,
      `Recommendation: ${analysis.overall_recommendation?.toUpperCase()}`,
      `AI-Gen Probability: ${analysis.ai_generated_probability || 'N/A'}%`,
      `Buzzwords: ${analysis.buzzword_density || 'N/A'}`,
      flagSummary ? `Flags: ${flagSummary}` : null,
      docFlags ? `Doc Issues: ${docFlags}` : null,
    ].filter(Boolean).join(' | ');

    await supabase.from('submissions').update({
      screening_notes: screeningNotes,
    } as any).eq('id', submissionId);

    // Notify secretariat if flagged
    const anyFlagged = analysis.overall_recommendation !== 'pass';
    if (anyFlagged && submissionId) {
      const { data: submission } = await supabase
        .from('submissions').select('school_name').eq('id', submissionId).single();
      const { data: secretariatRoles } = await supabase
        .from('user_roles').select('user_id').eq('role', 'secretariat').limit(10);

      if (secretariatRoles) {
        const flagList = (analysis.flags || []).slice(0, 5).join('\n• ');
        for (const role of secretariatRoles) {
          await supabase.from('notifications').insert({
            user_id: role.user_id,
            title: `⚠️ Integrity ${analysis.overall_recommendation === 'alert' ? 'Alert' : 'Review'}: ${submission?.school_name || 'Unknown'}`,
            message: `Score: ${analysis.integrity_score}/100 | AI-Gen: ${analysis.ai_generated_probability || 'N/A'}%\n\n• ${flagList || 'None'}\n\nConfidence: ${analysis.confidence_level}`,
            type: analysis.overall_recommendation === 'alert' ? 'error' : 'warning',
            link: '/secretariat/screening',
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      integrityScore: analysis.integrity_score,
      analysis,
      flagged: anyFlagged,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
