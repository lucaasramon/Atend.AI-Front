# Padrão responsivo do painel

Regras para toda tela nova do painel (`/admin/*`). Testado em 360px (celular), 768px (tablet) e 1280px (computador).

## Layout

- O `AdminLayout` já cuida do menu. No **celular e tablet** (abaixo de `md`), o menu vira gaveta com o botão ☰. No **computador**, fica a barra lateral recolhível.
- O conteúdo tem `p-4` no celular e `md:p-6` no computador. Não use margem fixa à esquerda.

## Componentes-padrão

| Use | Para |
|---|---|
| `PageHeader` (`@/components/PageHeader`) | Título, descrição e botões da tela. Os botões quebram de linha; título e botões ficam lado a lado só a partir de `lg` |
| `ResponsiveTable` (`@/components/ResponsiveTable`) | Toda tabela. No celular, a tabela rola na horizontal em vez de estourar a tela. Dê `min-w-[...]` à `<table>` para as colunas não se esmagarem |
| `Dialog` / `AlertDialog` (`@/components/ui`) | Já são responsivos: margem nas bordas, altura máxima de 90% da tela com rolagem e botões empilhados no celular |
| `cap()` (`@/lib/utils`) | Deixar maiúscula só a 1ª letra de datas ("Outubro de 2026"). Não use a classe `capitalize` em frases |

```tsx
<PageHeader
  title="Minha tela"
  description="O que ela faz"
  actions={<><Button variant="outline">Filtrar</Button><Button>Novo</Button></>}
/>

<ResponsiveTable>
  <table className="w-full min-w-[640px] text-sm">...</table>
</ResponsiveTable>
```

## Regras rápidas

- **Grades:** comece com 1 coluna e aumente por tamanho (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Nunca use `grid-cols-2` sozinho em formulário.
- **Linhas com várias ações:** use `flex-wrap`, ou empilhe no celular (`flex-col sm:flex-row`).
- **Cards com botões:** no celular, os botões vão para baixo do texto (`flex-col sm:flex-row`), para não espremer o conteúdo.
- **Larguras fixas** (`w-[130px]`, `w-80`): só a partir de `sm:`. No celular use `w-full` ou `flex-1`.
- **Texto longo:** `min-w-0` no contêiner flex e `truncate` ou `break-words` no texto.
- **Calendários e grades de dias:** no celular, mostre pontos em vez de texto dentro dos dias.

## Explicação da tela

Toda tela nova precisa de um texto em `src/lib/pageHelp.ts` (para que serve, ações e quem acessa). Ele aparece automaticamente no quadro "Para que serve esta tela?".
