import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY não está configurada');
    }

    const { userEmail, userName, company, phone, whatsappNumber } = await req.json();

    const emailHtml = `
      <h2>Nova Solicitação de Suporte para Configuração de Robô</h2>
      
      <h3>Informações do Cliente:</h3>
      <ul>
        <li><strong>Nome:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userEmail}</li>
        <li><strong>Empresa:</strong> ${company}</li>
        <li><strong>Telefone:</strong> ${phone}</li>
        <li><strong>WhatsApp:</strong> ${whatsappNumber}</li>
      </ul>
      
      <p><strong>Data da Solicitação:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      
      <hr />
      <p>O cliente solicitou suporte para configuração do robô de WhatsApp. Entre em contato o mais breve possível.</p>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'lucaz_ramon@hotmail.com',
        subject: `🤖 Nova Solicitação de Suporte - ${userName}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Erro ao enviar email: ${error}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending support request:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
