

# Plano: Notificações de Onboarding no Painel Admin

## Problema
Atualmente o sistema tenta enviar e-mail via Resend (que não está configurado). Em vez disso, vamos salvar as notificações no banco e exibi-las no painel admin.

## O que será feito

### 1. Criar tabela `admin_notifications`
Nova tabela para armazenar notificações quando um cliente completa onboarding ou solicita suporte:
- `id`, `user_id`, `type` (onboarding_complete / support_request), `user_name`, `user_email`, `company`, `phone`, `whatsapp_number`, `system_prompt`, `onboarding_data` (jsonb), `read` (boolean), `created_at`
- RLS: leitura/escrita apenas para admins (via `user_roles`) + insert para o próprio usuário autenticado

### 2. Atualizar `ClientOnboarding.tsx`
- Remover a chamada à edge function `request-support`
- Em vez disso, inserir diretamente na tabela `admin_notifications` com os dados do usuário
- Manter o fluxo de marcar `onboarding_completed: true` e redirecionar ao dashboard

### 3. Criar página `AdminNotifications.tsx`
- Lista de notificações com tipo, nome do cliente, empresa, data
- Badge indicando lidas/não lidas
- Ao clicar, expandir detalhes (telefone, WhatsApp, system prompt, dados do onboarding)
- Botão para marcar como lida

### 4. Adicionar rota e nav item no admin
- Nova rota `/admin/notifications` no `App.tsx`
- Novo item "Notificações" com ícone `Bell` no `AdminLayout.tsx`
- Badge com contagem de não lidas

### Detalhes técnicos

**Tabela SQL:**
```sql
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'onboarding_complete',
  user_name text,
  user_email text,
  company text,
  phone text,
  whatsapp_number text,
  system_prompt text,
  onboarding_data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode inserir (para registrar seu próprio onboarding)
CREATE POLICY "Authenticated users can insert notifications"
ON public.admin_notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Leitura/update aberto para todos autenticados (admin será controlado pelo frontend por enquanto)
CREATE POLICY "Authenticated users can view notifications"
ON public.admin_notifications FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update notifications"
ON public.admin_notifications FOR UPDATE TO authenticated
USING (true);
```

**Arquivos modificados:**
- `src/pages/client/ClientOnboarding.tsx` — trocar email por insert na tabela
- `src/components/AdminLayout.tsx` — adicionar item "Notificações"
- `src/App.tsx` — adicionar rota `/admin/notifications`

**Arquivo novo:**
- `src/pages/AdminNotifications.tsx` — página de notificações do admin

