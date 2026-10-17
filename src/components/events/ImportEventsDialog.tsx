import { useState } from "react";
import { Download, FileUp, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface Row {
  line: number;
  error?: string;
  data?: {
    title: string;
    starts_at: string;
    ends_at?: string;
    location?: string;
    description?: string;
    category?: string;
    ministries: string[];
    locations: string[];
    is_public: boolean;
  };
}

const HEADER = ["titulo", "data", "inicio", "fim", "local", "descricao", "categoria", "ministerios", "locais", "publico"];
const EXAMPLE = [
  ["Conferência de Jovens", "14/11/2026", "19:00", "22:00", "", "Tema: Sacrifice", "Conferência", "Jovens|Louvor", "Templo", "sim"],
  ["Culto de Santa Ceia", "06/12/2026", "18:00", "20:00", "", "", "Culto", "", "Templo", "sim"],
  ["Reunião de líderes", "08/12/2026", "20:00", "", "Sala 2", "", "Reunião", "", "", "não"],
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** CSV simples com aspas; separador ; ou , (detectado pelo cabeçalho) */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const sep = (clean.split("\n")[0].match(/;/g) || []).length >= (clean.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** dd/mm/aaaa + HH:MM (horário local) → ISO */
function toIso(date: string, time: string): string | null {
  const d = date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const t = (time.trim() || "00:00").match(/^(\d{1,2}):(\d{2})$/);
  if (!d || !t) return null;
  const dt = new Date(+d[3], +d[2] - 1, +d[1], +t[1], +t[2]);
  return isNaN(dt.getTime()) || dt.getDate() !== +d[1] ? null : dt.toISOString();
}

function toRows(table: string[][]): Row[] {
  const head = table[0].map(norm);
  const idx = (name: string) => head.indexOf(name);
  if (idx("titulo") < 0 || idx("data") < 0) return [{ line: 1, error: "Cabeçalho precisa ter as colunas titulo e data. Baixe o modelo." }];
  const get = (r: string[], name: string) => (idx(name) >= 0 ? (r[idx(name)] || "").trim() : "");
  const list = (v: string) => v.split(/[|,]/).map((x) => x.trim()).filter(Boolean);

  return table.slice(1).map((r, i) => {
    const line = i + 2;
    const title = get(r, "titulo");
    const starts = toIso(get(r, "data"), get(r, "inicio"));
    if (!title) return { line, error: "Sem título" };
    if (!starts) return { line, error: "Data/horário inválidos (use dd/mm/aaaa e HH:MM)" };
    const ends = get(r, "fim") ? toIso(get(r, "data"), get(r, "fim")) : undefined;
    if (ends === null) return { line, error: "Horário de término inválido" };
    const catRaw = norm(get(r, "categoria"));
    const category = catRaw ? CATEGORIES.find((c) => norm(c.label) === catRaw || c.value === catRaw)?.value : undefined;
    if (catRaw && !category) return { line, error: `Categoria desconhecida: ${get(r, "categoria")}` };
    return {
      line,
      data: {
        title,
        starts_at: starts,
        ends_at: ends || undefined,
        location: get(r, "local") || undefined,
        description: get(r, "descricao") || undefined,
        category,
        ministries: list(get(r, "ministerios")),
        locations: list(get(r, "locais")),
        is_public: !["nao", "n", "false", "0"].includes(norm(get(r, "publico"))),
      },
    };
  });
}

export default function ImportEventsDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const csv = [HEADER, ...EXAMPLE].map((r) => r.map((c) => (c.includes(";") ? `"${c}"` : c)).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-calendario-anual.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    const table = parseCsv(await file.text());
    setRows(table.length < 2 ? [{ line: 1, error: "Arquivo vazio" }] : toRows(table));
  };

  const valid = rows?.filter((r) => r.data) || [];
  const invalid = rows?.filter((r) => r.error) || [];

  const doImport = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ created: number; errors: { row: number; error: string }[]; status: string }>("/api/events/import", {
        events: valid.map((v) => v.data),
      });
      toast({
        title: `${r.created} evento(s) importado(s)`,
        description: r.status === "pending" ? "Aguardando aprovação dos administradores." : r.errors.length ? `${r.errors.length} não foram salvos.` : undefined,
      });
      setRows(null);
      onOpenChange(false);
      onImported();
    } catch (e: any) {
      toast({ title: "Erro na importação", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setRows(null); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar calendário anual</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Baixe o modelo e preencha no Excel ou Google Planilhas (uma linha por evento).</li>
            <li>Salve como <b>CSV</b> e envie aqui. Confira a prévia e clique em importar.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />Baixar modelo</Button>
            <label className="inline-flex">
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <span className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm cursor-pointer hover:opacity-90">
                <FileUp className="w-4 h-4 mr-2" />Escolher arquivo CSV
              </span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Colunas: titulo, data (dd/mm/aaaa), inicio e fim (HH:MM), local, descricao, categoria
            ({CATEGORIES.map((c) => c.label).join(", ")}), ministerios e locais (nomes separados por |) e publico (sim/não).
          </p>

          {rows && (
            <div className="space-y-2">
              <p>
                <b className="text-success">{valid.length} pronto(s) para importar</b>
                {invalid.length > 0 && <b className="text-destructive"> · {invalid.length} com erro (serão ignorados)</b>}
              </p>
              <div className="rounded-md border border-border max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="text-left p-1.5">Linha</th>
                      <th className="text-left p-1.5">Evento</th>
                      <th className="text-left p-1.5">Quando</th>
                      <th className="text-left p-1.5">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className={`border-t border-border ${r.error ? "text-destructive" : ""}`}>
                        <td className="p-1.5">{r.line}</td>
                        {r.error ? (
                          <td className="p-1.5" colSpan={3}>{r.error}</td>
                        ) : (
                          <>
                            <td className="p-1.5">{r.data!.title}</td>
                            <td className="p-1.5 whitespace-nowrap">{new Date(r.data!.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                            <td className="p-1.5 text-muted-foreground">
                              {[CATEGORIES.find((c) => c.value === r.data!.category)?.label, ...r.data!.locations, ...r.data!.ministries].filter(Boolean).join(" · ")}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">Ministérios e locais que não estiverem cadastrados com o mesmo nome são ignorados.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={doImport} disabled={!valid.length || busy}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Importar {valid.length || ""} evento(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
