import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from("audit_logs").insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: details || null,
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
