import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Cake, CheckCircle2, Clock, Loader2, RotateCcw, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Config {
  enabled: boolean;
  church: string;
  gap_min: number;
  gap_max: number;
  template: string;
  default_template: string;
  verses: string[];
  running: boolean;
  today: { id: string; name: string; birth_date: string; sent_at: string | null }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Parabéns automáticos no WhatsApp para os aniversariantes do dia */
export default function BirthdaySettingsDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [form, setForm] = useState({ enabled: true, church: "", gap_min: "3", gap_max: "10", template: "" });
  const [verse, setVerse] = useState(0);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCfg(null);
    api.get<Config>("/api/people/birthdays").then((c) => {
      setCfg(c);
      setForm({ enabled: c.enabled, church: c.church, gap_min: String(c.gap_min), gap_max: String(c.gap_max), template: c.template });
      setVerse(Math.floor(Math.random() * c.verses.length));
    }).catch((e: Error) => toast({ title: "Não foi possível carregar", description: e.message, variant: "destructive" }));
  }, [open]);

  const preview = useMemo(() => {
    if (!cfg) return "";
    return form.template
      .replace(/\{nome\}/g, "Maria")
      .replace(/\{igreja\}/g, form.church || "a igreja")
      .replace(/\{versiculo\}/g, cfg.verses[verse] || "")
      .trim();
  }, [cfg, form.template, form.church, verse]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/people/birthdays", { ...form, gap_min: Number(form.gap_min), gap_max: Number(form.gap_max) });
      toast({ title: form.enabled ? "Parabéns automáticos ligados" : "Parabéns automáticos desligados" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      await api.post("/api/people/birthdays/test", { church: form.church, template: form.template });
      toast({ title: "Exemplo enviado para o seu WhatsApp", description: "Pode levar alguns segundos para chegar." });
    } catch (e: any) {
      toast({ title: "Não foi possível enviar o teste", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Cake className="w-5 h-5 text-primary" />Parabéns aos aniversariantes</DialogTitle>
        </DialogHeader>

        {!cfg ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Todo dia, a partir das 8h, o robô D.Sync manda no WhatsApp de cada aniversariante do dia (pessoas de Cadastros com data de nascimento)
              uma mensagem em nome da igreja, com um versículo sorteado. Quem se cadastrar mais tarde no dia do aniversário também recebe (o sistema confere de hora em hora, até as 20h).
            </p>

            <label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              <span className="text-sm font-medium">{form.enabled ? "Envio automático ligado" : "Envio automático desligado"}</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2 sm:col-span-1">
                <Label>Nome da igreja</Label>
                <Input value={form.church} onChange={(e) => setForm({ ...form, church: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Intervalo entre uma mensagem e outra</Label>
                <div className="flex items-center gap-2 text-sm">
                  de <Input type="number" min={1} max={240} className="w-20" value={form.gap_min} onChange={(e) => setForm({ ...form, gap_min: e.target.value })} />
                  a <Input type="number" min={1} max={240} className="w-20" value={form.gap_max} onChange={(e) => setForm({ ...form, gap_max: e.target.value })} />
                  minutos
                </div>
                <p className="text-[11px] text-muted-foreground">Com vários aniversariantes no dia, cada parabéns sai num momento sorteado dentro desse intervalo.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Mensagem</Label>
                  {form.template !== cfg.default_template && (
                    <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => setForm({ ...form, template: cfg.default_template })}>
                      <RotateCcw className="w-3 h-3" />Texto padrão
                    </button>
                  )}
                </div>
                <Textarea rows={14} className="text-sm" value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} />
                <p className="text-[11px] text-muted-foreground">
                  <b>{"{nome}"}</b> primeiro nome · <b>{"{igreja}"}</b> nome da igreja · <b>{"{versiculo}"}</b> versículo sorteado ({cfg.verses.length} opções)
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Prévia</Label>
                  <button className="text-xs text-primary hover:underline" onClick={() => setVerse((v) => (v + 1) % cfg.verses.length)}>Outro versículo</button>
                </div>
                <div className="rounded-lg bg-[#005c4b] text-white p-3 text-sm whitespace-pre-wrap shadow-sm">
                  {preview.split(/(\*[^*\n]+\*)/g).map((part, i) =>
                    part.startsWith("*") && part.endsWith("*") ? <b key={i}>{part.slice(1, -1)}</b> : <span key={i}>{part}</span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={test} disabled={testing}>
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Enviar exemplo para o meu WhatsApp
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Aniversariantes de hoje</Label>
              {cfg.today.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ninguém faz aniversário hoje.</p>
              ) : (
                <div className="rounded-md border border-border divide-y divide-border">
                  {cfg.today.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{p.name}</span>
                      {p.sent_at ? (
                        <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3.5 h-3.5" />Enviado às {format(new Date(p.sent_at), "HH:mm")}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />{!cfg.enabled ? "Envio desligado" : cfg.running ? "Na fila" : new Date().getHours() < 20 ? "Será enviado hoje" : "Não enviado"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!cfg || saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
