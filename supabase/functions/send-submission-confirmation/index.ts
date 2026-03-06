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
    const { submissionId, userId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', userId)
      .single();

    const { data: submission } = await supabase
      .from('submissions')
      .select('school_name')
      .eq('id', submissionId)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: 'No email found' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const name = profile.full_name || 'Applicant';
    const school = submission?.school_name || 'your institution';

    const subject = '📩 TEGA Awards - Application Received';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #D4A017;">Dear ${name},</h1>
        <p>Thank you for submitting your TEGA Awards application for <strong>${school}</strong>.</p>
        <p>Your application has been <strong>successfully received</strong> and is now <strong>under verification</strong> by our Secretariat team.</p>
        <h3>What happens next?</h3>
        <ul>
          <li>Our team will review your application and supporting documents</li>
          <li>You will be notified once the screening process is complete</li>
          <li>You can track your application status on your TEGA Portal dashboard</li>
        </ul>
        <p>Please note that the review process may take some time. We appreciate your patience and commitment to transforming education.</p>
        <p>If you have any questions, please do not hesitate to reach out.</p>
        <p style="margin-top: 30px; color: #888;">— The TEGA Awards Secretariat</p>
      </div>
    `;

    console.log(`Email to: ${profile.email}, Subject: ${subject}`);

    // Create in-app notification as well
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Application Received',
      message: `Your TEGA Awards application for ${school} has been received and is under verification. You will be notified once screening is complete.`,
      type: 'info',
    });

    return new Response(JSON.stringify({ success: true, email: profile.email, subject }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
