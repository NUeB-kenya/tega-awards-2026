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
    } else if (status === 'winner') {
      subject = '🏆 TEGA Awards - You Are a Winner!';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #D4A017; font-size: 28px;">🏆 Congratulations, ${name}!</h1>
            <p style="font-size: 18px; color: #333;">You Are Officially a TEGA Awards Winner!</p>
          </div>
          <div style="background: #FEF9E7; border-left: 4px solid #D4A017; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 16px;">We are thrilled to announce that <strong>${school}</strong> has been officially declared a <strong style="color: #D4A017;">TEGA Awards Winner</strong>!</p>
          </div>
          <p>This prestigious recognition celebrates your institution's outstanding contribution to education transformation and global impact.</p>
          <h3 style="color: #D4A017;">🎁 Your Winner Benefits</h3>
          <ul style="line-height: 2;">
            <li><strong>Digital Certificate</strong> — Authenticated and delivered within 7 days of the gala</li>
            <li><strong>Custom Trophy</strong> — Engraved and shipped within 2–4 weeks</li>
            <li><strong>Global Media Exposure</strong> — Featured across TEGA platforms</li>
            <li><strong>Official Winner Badge</strong> — Licensed for your institution's use</li>
            <li><strong>TEGA Global Impact Registry</strong> — Permanent entry in our registry</li>
          </ul>
          <h3 style="color: #D4A017;">📋 Next Steps</h3>
          <ul>
            <li>Log in to your TEGA Portal dashboard for ceremony details</li>
            <li>Watch for further communications about the awards gala</li>
            <li>Prepare your acceptance remarks</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://portal.transformingeducation.ac/dashboard" style="background: #D4A017; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Your Dashboard</a>
          </div>
          <p style="margin-top: 30px; color: #888; text-align: center;">— The TEGA Awards Secretariat</p>
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
