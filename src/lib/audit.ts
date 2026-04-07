import { api } from "@/lib/api";

export async function logAudit(
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    await api.post("/api/audit", {
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: details || null,
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}
