import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Envolve tabelas largas: no celular a tabela rola na horizontal em vez de estourar a tela.
 * Use em toda tabela nova: <ResponsiveTable><table>...</table></ResponsiveTable>
 */
export default function ResponsiveTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-lg border border-border [-webkit-overflow-scrolling:touch]", className)}>
      {children}
    </div>
  );
}
