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
    const { submissionId, statements } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Analyze each nomination statement for plagiarism indicators
    const results: Record<string, any> = {};
    let anyFlagged = false;

    for (const [category, statement] of Object.entries(statements as Record<string, string>)) {
      if (!statement || statement.length < 50) continue;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: `You are an academic integrity checker. Analyze the following nomination statement for signs of plagiarism, AI-generated generic content, or copied text. Look for:
1. Overly generic phrases that lack specificity
2. Inconsistent writing style or tone shifts
3. Unnaturally perfect grammar combined with vague claims
4. Common plagiarism patterns (copied award descriptions, boilerplate text)

Respond with a JSON object: {"score": 0-100, "flags": ["list of concerns"], "recommendation": "pass" or "review"}
- score: 0 = likely original, 100 = highly suspicious
- If score > 60, recommendation should be "review"
- Keep flags concise (max 3)`,
            },
            { role: 'user', content: `Category: ${category}\n\nStatement:\n${statement}` },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'report_analysis',
                description: 'Report plagiarism analysis results',
                parameters: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', description: 'Plagiarism suspicion score 0-100' },
                    flags: { type: 'array', items: { type: 'string' }, description: 'List of concerns' },
                    recommendation: { type: 'string', enum: ['pass', 'review'] },
                  },
                  required: ['score', 'flags', 'recommendation'],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'report_analysis' } },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const analysis = JSON.parse(toolCall.function.arguments);
          results[category] = analysis;
          if (analysis.recommendation === 'review') anyFlagged = true;
        }
      }
    }

    // If any flagged, create a notification for secretariat
    if (anyFlagged && submissionId) {
      const { data: submission } = await supabase
        .from('submissions')
        .select('school_name')
        .eq('id', submissionId)
        .single();

      // Get secretariat users to notify
      const { data: secretariatRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'secretariat')
        .limit(10);

      if (secretariatRoles) {
        const flaggedCats = Object.entries(results)
          .filter(([_, r]: any) => r.recommendation === 'review')
          .map(([cat]) => cat);

        for (const role of secretariatRoles) {
          await supabase.from('notifications').insert({
            user_id: role.user_id,
            title: '⚠️ Content Review Flag',
            message: `Application for "${submission?.school_name || 'Unknown'}" has been flagged for content review in categories: ${flaggedCats.join(', ')}. Please review the nomination statements during screening.`,
            type: 'warning',
            link: '/secretariat/screening',
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results, flagged: anyFlagged }), {
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
