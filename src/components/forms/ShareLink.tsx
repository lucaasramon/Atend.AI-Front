import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, MessageCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  url: string;
  /** Texto que acompanha o link ao compartilhar no WhatsApp */
  message: string;
  /** Nome do arquivo do QR code (sem extensão) */
  qrName: string;
}

/** Link público com copiar, abrir, enviar no WhatsApp e QR code (para projetar ou imprimir) */
export default function ShareLink({ url, message, qrName }: Props) {
  const { toast } = useToast();
  const [qrOpen, setQrOpen] = useState(false);
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (!qrOpen) return;
    QRCode.toDataURL(url, { width: 640, margin: 2 }).then(setQr).catch(() => setQr(""));
  }, [qrOpen, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado" });
    } catch {
      toast({ title: "Não foi possível copiar", description: url, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input readOnly value={url} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
        <Button variant="outline" size="icon" onClick={copy} title="Copiar link"><Copy className="w-4 h-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}`} target="_blank" rel="noreferrer">
            <MessageCircle className="w-4 h-4 mr-2" />Enviar no WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="outline" onClick={() => setQrOpen(true)}><QrCode className="w-4 h-4 mr-2" />QR code</Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Abrir</a>
        </Button>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR code do formulário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Projete no telão ou imprima: a pessoa aponta a câmera do celular e o formulário abre.</p>
          {qr && <img src={qr} alt="QR code" className="w-full rounded-lg bg-white" />}
          <Button asChild disabled={!qr}>
            <a href={qr} download={`${qrName}.png`}><Download className="w-4 h-4 mr-2" />Baixar imagem</a>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
