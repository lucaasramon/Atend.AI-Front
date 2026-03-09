import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  user_name: string | null;
  user_email: string | null;
  company: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  system_prompt: string | null;
  onboarding_data: any;
  read: boolean;
  created_at: string;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast({
        title: "Erro ao carregar notificações",
        description: "Não foi possível carregar as notificações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;

      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));

      toast({
        title: "Marcada como lida",
        description: "Notificação atualizada com sucesso.",
      });
    } catch (error) {
      console.error("Error marking as read:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a notificação.",
        variant: "destructive",
      });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "onboarding_complete":
        return "Onboarding Completo";
      case "support_request":
        return "Solicitação de Suporte";
      default:
        return type;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe as solicitações e onboardings dos clientes
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {unreadCount} não lida{unreadCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Nenhuma notificação ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card 
              key={notification.id}
              className={`transition-colors ${!notification.read ? "border-primary bg-primary/5" : ""}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={notification.read ? "secondary" : "default"}>
                        {getTypeLabel(notification.type)}
                      </Badge>
                      {!notification.read && (
                        <Badge variant="destructive">Novo</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">
                      {notification.user_name || "Sem nome"}
                    </CardTitle>
                    <CardDescription>
                      {notification.company || "Empresa não informada"} • {" "}
                      {format(new Date(notification.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Marcar como lida
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(notification.id)}
                    >
                      {expandedId === notification.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedId === notification.id && (
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{notification.user_email || "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                      <p className="text-sm">{notification.phone || "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
                      <p className="text-sm">{notification.whatsapp_number || "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                      <p className="text-sm">{notification.company || "Não informado"}</p>
                    </div>
                  </div>

                  {notification.system_prompt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">System Prompt</p>
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm whitespace-pre-wrap">{notification.system_prompt}</p>
                      </div>
                    </div>
                  )}

                  {notification.onboarding_data && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Dados do Onboarding</p>
                      <div className="bg-muted p-3 rounded-md">
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(notification.onboarding_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
