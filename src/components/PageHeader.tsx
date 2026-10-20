import { ReactNode } from "react";

interface Props {
  title: ReactNode;
  description?: ReactNode;
  /** Botões do cabeçalho: quebram de linha no celular */
  actions?: ReactNode;
}

/** Cabeçalho padrão das telas (responsivo). Use em toda tela nova. */
export default function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-xl sm:text-2xl font-semibold text-foreground break-words">
          <span className="w-1.5 h-6 sm:h-7 rounded-full bg-primary shrink-0" aria-hidden />
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 [&>*]:shrink-0">{actions}</div>}
    </div>
  );
}
