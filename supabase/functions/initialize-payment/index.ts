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

    const { submissionId, email, amount = 100, callbackUrl } = await req.json(); // amount in kobo (KES 1 = 100 kobo)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        submission_id: submissionId,
        amount: amount / 100, // Store in KES
        currency: 'KES',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      return new Response(JSON.stringify({ error: paymentError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Paystack transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount, // in kobo
        currency: 'KES',
        reference: payment.id,
        callback_url: callbackUrl,
        metadata: {
          submission_id: submissionId,
          payment_id: payment.id,
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return new Response(JSON.stringify({ error: paystackData.message || 'Paystack error' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update payment with transaction reference
    await supabase.from('payments').update({
      transaction_reference: paystackData.data.reference,
    }).eq('id', payment.id);

    return new Response(JSON.stringify({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      payment_id: payment.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
