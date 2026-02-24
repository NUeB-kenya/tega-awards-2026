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
    const { submissionId, status, userId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user profile
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('user_id', userId).single();
    const { data: submission } = await supabase.from('submissions').select('school_name').eq('id', submissionId).single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: 'No email found' }), { status: 400, headers: corsHeaders });
    }

    const name = profile.full_name || 'Applicant';
    const school = submission?.school_name || 'your institution';

    let subject = '';
    let html = '';

    if (status === 'approved') {
      subject = '🎉 TEGA Awards - Application Approved!';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4A017;">Congratulations, ${name}!</h1>
          <p>We are thrilled to inform you that your TEGA Awards application for <strong>${school}</strong> has been <span style="color: #22c55e; font-weight: bold;">APPROVED</span>.</p>
          <p>Your nomination has demonstrated exceptional merit in education transformation, and we are proud to advance your application to the next stage of the awards process.</p>
          <h3>What happens next?</h3>
          <ul>
            <li>Your application will be reviewed by our panel of judges</li>
            <li>You will receive updates on the evaluation progress</li>
            <li>Finalists will be notified ahead of the awards ceremony</li>
          </ul>
          <p>Log in to your TEGA Portal dashboard to track your application status.</p>
          <p style="margin-top: 30px; color: #888;">— The TEGA Awards Secretariat</p>
        </div>
      `;
    } else if (status === 'declined') {
      subject = 'TEGA Awards - Application Update';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4A017;">Dear ${name},</h1>
          <p>Thank you for your TEGA Awards application for <strong>${school}</strong>.</p>
          <p>After careful consideration by our review committee, we regret to inform you that your application has not been selected to advance at this time.</p>
          <p>This decision was not made lightly, and we want you to know that your commitment to education transformation is valued and appreciated.</p>
          <h3>Moving Forward</h3>
          <ul>
            <li>You are welcome to reapply in the next awards cycle</li>
            <li>Consider strengthening your supporting documentation</li>
            <li>Continue your impactful work in education — it matters</li>
          </ul>
          <p>We encourage you to stay connected and continue making a difference.</p>
          <p style="margin-top: 30px; color: #888;">— The TEGA Awards Secretariat</p>
        </div>
      `;
    } else {
      subject = 'TEGA Awards - Application Status Update';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4A017;">Dear ${name},</h1>
          <p>Your TEGA Awards application for <strong>${school}</strong> has been updated to: <strong>${status}</strong>.</p>
          <p>Please log in to your TEGA Portal for more details.</p>
          <p style="margin-top: 30px; color: #888;">— The TEGA Awards Secretariat</p>
        </div>
      `;
    }

    // Send email via Supabase Auth admin (uses built-in email)
    // Note: For production, integrate with a proper email provider
    // For now, we log the email content
    console.log(`Email to: ${profile.email}, Subject: ${subject}`);

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
