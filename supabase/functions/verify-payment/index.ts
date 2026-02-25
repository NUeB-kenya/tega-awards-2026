import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Paystack not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { reference } = await req.json();

    // Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const paystackData = await paystackRes.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (paystackData.status && paystackData.data.status === 'success') {
      // Update payment status
      const { data: payment } = await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          payment_method: paystackData.data.channel,
          paid_at: new Date().toISOString(),
          transaction_reference: reference,
        })
        .eq('transaction_reference', reference)
        .select()
        .single();

      if (payment) {
        // Update submission status to "paid"
        await supabase.from('submissions').update({ status: 'paid' }).eq('id', payment.submission_id);

        // Create notification
        const { data: sub } = await supabase.from('submissions').select('submitter_id, school_name').eq('id', payment.submission_id).single();
        if (sub) {
          await supabase.from('notifications').insert({
            user_id: sub.submitter_id,
            title: 'Payment Confirmed',
            message: `Your payment of KES 1 for ${sub.school_name} has been confirmed. Your application is now submitted.`,
            type: 'success',
          });
        }

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: payment.submission_id, // placeholder
          action_type: 'payment_completed',
          entity_type: 'payment',
          entity_id: payment.id,
          metadata_json: { reference, amount: paystackData.data.amount / 100, channel: paystackData.data.channel },
        });
      }

      return new Response(JSON.stringify({ success: true, status: 'completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Payment failed
      await supabase.from('payments').update({
        payment_status: 'failed',
        transaction_reference: reference,
      }).eq('transaction_reference', reference);

      return new Response(JSON.stringify({ success: false, status: 'failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
