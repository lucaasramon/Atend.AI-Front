import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Star, StarOff } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  date: string;
  saved: boolean;
  sentiment: "positive" | "neutral" | "negative";
}

const mockLeads: Lead[] = [
  { id: "1", name: "Maria Silva", phone: "+5511999112233", lastMessage: "Quero saber mais sobre o plano Pro", date: "2026-03-06 14:22", saved: true, sentiment: "positive" },
  { id: "2", name: "Carlos Souza", phone: "+5511988223344", lastMessage: "Qual o preço do serviço?", date: "2026-03-06 13:10", saved: false, sentiment: "neutral" },
  { id: "3", name: "Juliana Alves", phone: "+5521977334455", lastMessage: "Não funcionou como esperado", date: "2026-03-06 11:45", saved: false, sentiment: "negative" },
  { id: "4", name: "Pedro Santos", phone: "+5531966445566", lastMessage: "Adorei o atendimento!", date: "2026-03-05 18:30", saved: true, sentiment: "positive" },
  { id: "5", name: "Fernanda Lima", phone: "+5541955556677", lastMessage: "Vocês têm desconto para anual?", date: "2026-03-05 16:15", saved: false, sentiment: "neutral" },
];

const sentimentConfig = {
  positive: { label: "Positivo", variant: "default" as const, className: "bg-success/10 text-success border-success/20" },
  neutral: { label: "Neutro", variant: "secondary" as const, className: "" },
  negative: { label: "Negativo", variant: "destructive" as const, className: "" },
};

export default function ClientLeads() {
  const [leads, setLeads] = useState(mockLeads);
  const [search, setSearch] = useState("");

  const filtered = leads.filter(
    (l) => l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
  );

  const toggleSaved = (id: string) => {
    setLeads(leads.map((l) => (l.id === id ? { ...l, saved: !l.saved } : l)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Contatos que interagiram com seu WhatsApp</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou telefone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Última Mensagem</TableHead>
                <TableHead>Sentimento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-12">Salvar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => {
                const sentiment = sentimentConfig[lead.sentiment];
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="font-mono text-xs">{lead.phone}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {lead.lastMessage}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sentiment.variant} className={sentiment.className}>
                        {sentiment.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{lead.date}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleSaved(lead.id)}>
                        {lead.saved ? (
                          <Star className="w-4 h-4 fill-warning text-warning" />
                        ) : (
                          <StarOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
