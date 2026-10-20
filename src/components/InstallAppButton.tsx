import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canPromptInstall, isIOS, isStandalone, onInstallChange, promptInstall } from "@/lib/pwa";

interface Props {
  /** Só o ícone (menu lateral recolhido) */
  compact?: boolean;
  className?: string;
}

/** "Instalar app": instalador do navegador quando houver; senão, mostra como adicionar à tela inicial */
export default function InstallAppButton({ compact, className }: Props) {
  const [, refresh] = useState(0);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const off = onInstallChange(() => refresh((n) => n + 1));
    return () => {
      off();
    };
  }, []);

  if (isStandalone()) return null;

  const install = async () => {
    if (canPromptInstall()) await promptInstall();
    else setHelp(true);
  };

  const ios = isIOS();

  return (
    <>
      <button
        onClick={install}
        title="Instalar app"
        className={
          className ||
          "flex items-center justify-center w-full py-2 rounded-md text-primary hover:bg-primary/10 transition-colors"
        }
      >
        <Download className="w-4 h-4" />
        {!compact && <span className="ml-3 text-sm">Instalar app</span>}
      </button>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
              Instalar o D.Sync
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O D.Sync vira um app na tela inicial do celular: abre em tela cheia, sem a barra do navegador.
          </p>
          {ios ? (
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>Abra este site no <b>Safari</b>.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span className="flex items-center gap-1 flex-wrap">Toque em <b>Compartilhar</b> <Share className="w-4 h-4 inline" /> (na barra de baixo).</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span className="flex items-center gap-1 flex-wrap">Escolha <b>Adicionar à Tela de Início</b> <SquarePlus className="w-4 h-4 inline" /> e toque em <b>Adicionar</b>.</span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>Abra este site no <b>Chrome</b> (ou Edge/Samsung Internet).</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span className="flex items-center gap-1 flex-wrap">Toque no menu <MoreVertical className="w-4 h-4 inline" /> no canto de cima.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</span>
              </li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
