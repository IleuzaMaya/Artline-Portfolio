# README — Orçamento de Emoldurados

Este repositório contém um **frontend React (Vite)** e **Funções Edge do Supabase (Deno)** que juntos formam um orçamento dinâmico para emoldurados: molduras em camadas, passe-partout, vidros, fundos, impressão, chassi, “entre vidros”, reforço para moldura caixa, camisa/objeto, serviços diversos e markup.

---

## Visão Geral

- **Frontend** (`/frontend`): SPA em React. Busca o catálogo via Axios nas Edge Functions e executa o cálculo no cliente (`utils/calcularOrcamento.js`).
- **Edge Functions** (`/supabase/functions`):
  - `catalogo`: endpoints REST unificados para listar catálogos (vidros, fundos, passepartouts, baguetes, impressoes, molduras por uso etc.), com *fallbacks* quando colunas variam entre bancos.
  - `molduras`: (opcional) endpoint dedicado para molduras por uso; pode ser usado em vez do caminho `catalogo/molduras`.

Os dados residem em tabelas como `mt_molduras`, `mt_vidros`, `mt_fundos`, … e aceitam **nomes de colunas flexíveis** (`preco_m2`, `valor_m2`, `preco`, `valor` etc.). O frontend faz *normalização* para números com vírgula/ponto e ignora itens sem preço.

---

## Estrutura de Pastas

```
frontend/
  src/
    components/
      FloatingInput.jsx
      FloatingSelect.jsx
      MolduraThumb.jsx
    lib/
      edgeApi.js
    pages/
      Orcamento.jsx
    utils/
      calcularOrcamento.js
supabase/
  functions/
    catalogo/
      index.ts
    molduras/            # opcional
      index.ts
```

---

## Variáveis de Ambiente

### Frontend (Vite)
Crie `frontend/.env`:

```env
VITE_SUPABASE_URL=https://<SEU-PROJETO>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Opcional: se você usa domínio separado para funções edge (recomendado)
# Ex.: https://<SEU-PROJETO>.functions.supabase.co/functions/v1
VITE_SUPABASE_FUNCTIONS_URL=https://<SEU-PROJETO>.functions.supabase.co/functions/v1
```

> Se `VITE_SUPABASE_FUNCTIONS_URL` não estiver definida, o app **cai automaticamente** para `${VITE_SUPABASE_URL}/functions/v1`.

### Edge Functions (Supabase)
Configure no painel ou via CLI:

```env
SUPABASE_URL=https://<SEU-PROJETO>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ALLOWED_ORIGIN=https://app.artemoldurados.com.br  # ou "*", se necessário
```

> **Nunca** exponha `SERVICE_ROLE_KEY` no frontend. Ela fica apenas no ambiente das funções.

---

## Rodando Localmente

### Frontend

```bash
cd frontend
npm i
npm run dev
# abre http://localhost:5173
```

### Edge Functions (local com Supabase CLI)

```bash
# precisa do supabase-cli instalado
cd supabase/functions
supabase functions serve catalogo --env-file ../.env
# em outro terminal você pode servir 'molduras' se quiser:
# supabase functions serve molduras --env-file ../.env
```

> Em produção, use `supabase functions deploy catalogo` (e `molduras`, se aplicável).

---

## API (Edge Functions)

Base URL (produção):  
`https://<PROJECT>.functions.supabase.co/functions/v1`

### `GET /catalogo`  
Ping/healthcheck.

### `GET /catalogo/tipos-orcamento`

### `GET /catalogo/molduras?uso=<superficie|entre_vidros|profundidade|flutuante|camisa|tela>&permiteA=1`
- Filtra por uso. `permiteA=1` expõe alumínio.
- **Campos usados no front**:  
  `id, nome, codigo_principal, tipo, categoria, uso_tipo, tipo_material, largura_mm|largura, imagem_url` + preço por metro (qualquer alias).

### `GET /catalogo/vidros | /fundos | /passepartouts | /baguetes | /impressoes | /chassis | /camisas | /diversos`
- Retornam apenas itens **ativos** e com algum preço válido.
- Aliases aceitos:
  - por m²: `preco_m2 | valor_m2 | preco | valor`
  - por metro: `preco_ml | valor_ml | preco_metro | valor_metro`
  - chassi: `preco_ml | valor_ml | preco_m | valor_m`

### `GET /catalogo/reforco?tipo=matte|canvas`
- Tabela de reforço por faixas de largura/altura (aceita rotação).
- Aliases aceitos: `largura_min_cm|w_min`, `largura_max_cm|w_max`, `altura_min_cm|h_min`, `altura_max_cm|h_max`, `preco_total|valor|custo_total`.

### (Opcional) `GET /molduras?uso=...&permiteA=1`
- Mesmo propósito de `/catalogo/molduras`, isolado.

---

## Contratos mínimos das Tabelas

> A engine suporta **aliases**. Abaixo, chaves que o front tenta ler.

- **mt_molduras**: `id`, `nome|descricao|titulo|modelo`, `codigo_principal|codigo|referencia`, `tipo|categoria`, `uso_tipo ('C' caixa, 'A' alumínio)`, `tipo_material`, `largura_mm|largura`, `<preço por metro (qualquer alias)>`, `imagem_url|image_url|url_imagem|foto_url`.
- **mt_vidros / mt_fundos / mt_impressoes / mt_passepartouts**:
  - por m²: `preco_m2|valor_m2|preco|valor`
  - passepartout também aceita `preco_ml|valor_ml` + `preco_abertura_extra`.
- **mt_baguetes / mt_chassis**: `preco_ml|valor_ml|preco_m|valor_m`.
- **mt_camisa_objeto**: `ativo`, `preco_m2|valor_m2` **ou** preço fixo `preco|valor`.
- **mt_diversos**: `nome`, `preco|valor|preco_unit|valor_unit`, `faixa_aplicacao ('ATÉ'/'ACIMA')`.
- **mt_reforco**: faixas `largura_min/max`, `altura_min/max` + `preco_total`.

---

## Lógica de Cálculo (resumo)

Arquivo: `frontend/src/utils/calcularOrcamento.js`

1. **Normalização numérica**: aceita “R$ 12,50”, “1.234,56” etc.
2. **Dimensões**:
   - Interna: `L × A`.
   - Com passe-partout: soma margem nos 4 lados (verifica folha **102×152 cm**, com rotação e segurança 2 cm).
3. **Planos (m²)**: vidro (frontal + comum no fundo quando “entre vidros”), fundo, fundo extra, impressão.
4. **Passe-partout**:
   - Prioriza **ML** (`preco_ml`); se ausente, usa **m²**.
   - Aberturas extras: `qtdExtras × preco_abertura_extra`.
5. **Molduras em camadas**:
   - Camadas M1→M2→M3; a cada camada aumenta o retângulo por `largura_face` (cm).
   - Preço por metro (suporta vários aliases e até string “R$ … / ml”).
   - Perda técnica: **1 cm por canto** (somado ao perímetro).
6. **Baguete interna** (quando moldura caixa ou `tipoSelecionado.usa_baguete`): perímetro **interno** × preço ML.
7. **Reforço para moldura caixa**:
   - Prioriza **tabela** (`mt_reforco`); se não casar, usa fallback: **8% do custo da 1ª camada (mínimo R$25)** quando maior lado ≥ 70 cm **ou** perímetro interno ≥ 240 cm.
8. **Chassi (tela)**: preço por metro × perímetro da obra. Info “3 mm/5 mm” só informativa.
9. **Camisa/Objeto**: adicional **m²** (`preco_m2`) ou **fixo** (`preco`); fonte `camisaObjetoExtra` (se vier) ou `mt_camisa_objeto`.
10. **Diversos**: soma unitários compatíveis com a faixa (até 50 cm / acima).
11. **Totais**: soma unitária → multiplica por quantidade → aplica markup.

> O componente **Orcamento.jsx** exibe mensagens de risco (área grande com moldura fina, custo de reforço, etc.), e lista os itens efetivamente somados.

---

## Fluxo do Frontend

- **edgeApi.js** resolve automaticamente o baseURL das funções:
  - Usa `VITE_SUPABASE_FUNCTIONS_URL` **ou** `${VITE_SUPABASE_URL}/functions/v1`.
  - Base do catálogo: `.../catalogo`.
- **Orcamento.jsx**:
  - Carrega listas (`/tipos-orcamento`, `/vidros`, `/fundos`, `/passepartouts`, `/baguetes`, `/impressoes`, `/chassis`, `/camisas`, `/diversos`).
  - Ao selecionar **Tipo**, busca **molduras** com `uso` mapeado:  
    `superficie, entre_vidros, profundidade, flutuante, camisa, tela`.
    - Em **Entre Vidros**, check “É camisa?” libera alumínio com `permiteA=1`.
  - Regras de **perfil** por tipo controlam UI (ex.: em Entre Vidros o fundo é fixo “vidro comum”).
  - **MolduraThumb** carrega imagem por ordem de candidatos:  
    `/molduras/{codigo}.jpg|.png` → `imagem_url` do banco → placeholder.

---

## Perfis de Tipo (comportamentos)

| Tipo            | PP | Aberturas | Vidro frontal | Vidro fundo | Fundo | Foam extra | Baguete | MolduraUsoTipo |
|-----------------|----|-----------|---------------|-------------|-------|------------|---------|----------------|
| Superfície/Fotos| ✔︎  | ✔︎        | ✔︎            | —           | ✔︎    | —          | —       | —              |
| Entre Vidros    | ✖︎  | —         | ✔︎            | **Comum**   | ✖︎    | —          | —       | **C**          |
| Profundidade    | ✔︎  | —         | ✖︎ (somente comum)| —      | ✔︎    | —          | ✔︎      | **C**          |
| Flutuante       | ✖︎  | —         | ✖︎            | —           | ✔︎    | **✔︎**     | ✔︎      | **C**          |
| Camisa/Objeto   | ✔︎* | ✔︎        | ✖︎ (somente comum)| —      | ✔︎    | **✔︎**     | ✔︎      | **C**          |
| Tela            | ✖︎  | —         | ✖︎            | —           | ✖︎    | —          | —       | —              |

\* *Passe-partout sem margem por padrão.*

---

## Dicas de Dados (para “não soma moldura”)

Se o total **não muda** ao escolher molduras:

1. Confira na aba **Network** a resposta de `/catalogo/molduras?...`:
   - Precisa existir **algum campo de preço por metro** com valor > 0.  
     Aceitos: `preco_ml`, `valor_ml`, `preco_metro`, `valor_metro`,  
     `preco_por_metro`, `valor_por_metro`, `preco_por_ml`, `valor_por_ml`,  
     `preco_m`, `valor_m`, `preco`, `valor` ou até **string** “R$ … / ml”.
2. Verifique se `largura_mm` **ou** `largura` (cm) está preenchida (define o avanço da camada).
3. Itens de catálogo só entram se `ativo=true` (quando a tabela possui a coluna) **e** preço > 0.
4. Console: se aparecer “ReferenceError … is not defined”, atualize o front (os helpers agora protegem contra campos ausentes).

---

## Deploy

```bash
# Funções
cd supabase/functions
supabase functions deploy catalogo
supabase functions deploy molduras   # se estiver usando

# Frontend (exemplos)
cd frontend
npm run build
# publique o conteúdo de dist/ no seu host (Vercel, Netlify, etc.)
```

---

## Testes Rápidos (checklist)

- [ ] Carregou listas iniciais sem erros (Console limpo).
- [ ] Selecionou **Tipo** → **molduras** listadas conforme uso.
- [ ] Selecionou M1/M2/M3 → **total muda**.
- [ ] “Entre Vidros” → 2 vidros informados, sem fundo.
- [ ] Passe-partout:
  - ML priorizado; se faltar ML, usa m².
  - Aberturas extras somam.
  - Excede folha 102×152 → PP desativado automaticamente.
- [ ] Moldura “Caixa” grande → reforço por tabela ou fallback (mensagem aparece).
- [ ] “Tela” com chassi → inclui no total e mostra 3/5 mm conforme área.
- [ ] “Camisa/Objeto” → adicional aplicado (fixo ou m²).
- [ ] “Diversos” → serviço é somado conforme faixa (até / acima 50 cm).
- [ ] Markup e Quantidade corretos nos totais.

---

## Troubleshooting

- **CORS**: adicione o domínio do app em `ALLOWED_ORIGIN` ou use `*` (apenas para testes).
- **Função sem dados**: revise `SUPABASE_URL` e `SERVICE_ROLE_KEY` no ambiente da função.
- **Números com vírgula**: o parser aceita `R$ 1.234,56`; evite strings não numéricas sem valores.
- **Imagens de moldura**: se não existir `/molduras/{codigo}.jpg|.png`, garanta `imagem_url` na tabela.

---

## Exemplos (curl)

```bash
# Tipos de orçamento
curl -s 'https://<PROJECT>.functions.supabase.co/functions/v1/catalogo/tipos-orcamento'

# Molduras para "superficie"
curl -s 'https://<PROJECT>.functions.supabase.co/functions/v1/catalogo/molduras?uso=superficie'

# Vidros ativos com preço
curl -s 'https://<PROJECT>.functions.supabase.co/functions/v1/catalogo/vidros'

# Tabela de reforço (matte)
curl -s 'https://<PROJECT>.functions.supabase.co/functions/v1/catalogo/reforco?tipo=matte'
```

---
==================================================
---


## Roadmap (sugestões)

### Exportar orçamento (PDF)
**Objetivo**  
Permitir baixar um PDF com o resumo (dimensões, itens somados, composição e totais), mantendo layout consistente.

**UX**  
Botão “Exportar PDF” no final do formulário. Abre diálogo de nome do arquivo (opcional) e gera o PDF do bloco de resumo.

**Stack sugerida**  
`html2canvas` + `jspdf` (100% client-side).
```bash
npm i html2canvas jspdf
```

**Passos (Frontend)**
1) Envolver o bloco de resumo em um container com `id="print-resumo"`.
2) Utilitário de exportação:
```js
// src/utils/exportarPdf.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportarOrcamentoPDF(nomeArquivo = "orcamento.pdf") {
  const el = document.getElementById("print-resumo");
  if (!el) throw new Error("Bloco de resumo não encontrado");
  const canvas = await html2canvas(el, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgW = pageW - 60;          // 30px de margem de cada lado
  const ratio = canvas.height / canvas.width;
  const imgH = imgW * ratio;

  pdf.addImage(imgData, "PNG", 30, 30, imgW, imgH, "", "FAST");
  pdf.save(nomeArquivo);
}
```
3) No `Orcamento.jsx`, adicionar botão:
```jsx
import { exportarOrcamentoPDF } from "../utils/exportarPdf";

<button className="btn btn-primary mt-3" onClick={() => exportarOrcamentoPDF()}>
  Exportar PDF
</button>
```

**DoD (aceite)**
- PDF contém dimensões, itens somados e totais.
- Funciona em Chrome/Edge/Safari.
- Imagens de moldura saem nítidas (`scale:2`).

---

### Tabela detalhada de composição do preço
**Objetivo**  
Mostrar *como* o total foi construído (m², ML, unitário, quantidade, subtotal por item/camada).

**Dados**  
A função `calcularOrcamento` retorna `resultado.custos` e `moldurasCamadas` (perímetros, preço ML, custos, etc.).

**Passos (Frontend)**
Criar componente:
```jsx
// src/components/TabelaComposicaoPreco.jsx
import React from "react";

const fmt = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n||0));

export default function TabelaComposicaoPreco({ custos }) {
  if (!custos) return null;
  const rows = [];

  (custos.moldurasCamadas || []).forEach((c, i) => {
    rows.push({
      item: `Moldura ${i+1}`,
      base: `${c.perimetroM?.toFixed(2)} ml + perda ${c.perdaChanfroM?.toFixed(2)} ml`,
      unit: fmt(c.precoML),
      sub: fmt(c.custo),
    });
  });

  const simples = [
    ["Baguete interna", custos.bagueteInterna],
    ["Vidro frontal", custos.vidroFrontal],
    ["Vidro (fundo comum)", custos.vidroFundoComum],
    ["Fundo", custos.fundo],
    ["Fundo extra", custos.fundoExtra],
    ["Passe-partout", custos.passepartout],
    ["Passe-partout (aberturas extras)", custos.passepartoutAberturasExtra],
    ["Impressão", custos.impressao],
    ["Chassi", custos.chassi],
    ["Reforço", custos.reforco],
    ["Serviços diversos", custos.diversos],
  ];
  simples.forEach(([label, val]) => {
    if (Number(val) > 0) rows.push({ item: label, base: "—", unit: "—", sub: fmt(val) });
  });

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Item</th>
            <th className="py-2 pr-4">Base de cálculo</th>
            <th className="py-2 pr-4">Preço unit.</th>
            <th className="py-2">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-1 pr-4">{r.item}</td>
              <td className="py-1 pr-4">{r.base}</td>
              <td className="py-1 pr-4">{r.unit}</td>
              <td className="py-1">{r.sub}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="py-2 font-semibold text-right">Subtotal (unitário)</td>
            <td className="py-2 font-semibold">{fmt(custos.subtotalMateriaisUnit)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

**DoD**
- Valores batem com o total.
- Molduras detalhadas por camada.
- Transparência na formação do preço.

---

### Cache leve de catálogos no front
**Objetivo**  
Evitar hits repetidos para listas estáticas (vidros, fundos, etc.), reduzindo latência.

**Opção 1 — TTL em `sessionStorage`**
```js
// src/lib/cacheGet.js
import { edge } from "./edgeApi";

const KEY = "edge-cache";
const TTL_MS = 10 * 60 * 1000;

function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; } }
function save(obj) { sessionStorage.setItem(KEY, JSON.stringify(obj)); }

export async function getCached(path, params={}, ttlMs=TTL_MS) {
  const cache = load();
  const k = path + "?" + new URLSearchParams(params).toString();
  const now = Date.now();
  const hit = cache[k];
  if (hit && (now - hit.t) < ttlMs) return hit.d;

  const { data } = await edge.get(path, { params });
  cache[k] = { t: now, d: data };
  save(cache);
  return data;
}
```
Trocar os `api.get` por `getCached("/vidros")`, etc.

**Opção 2 — TanStack Query** (`@tanstack/react-query`) com `staleTime` alto.

**DoD**
- Reabertura da tela: catálogos aparecem instantaneamente.
- Após TTL, revalida silenciosamente.

---

### Internacionalização (i18n)
**Objetivo**  
Suportar PT/EN com `i18next` + `react-i18next` e `Intl.NumberFormat` para moedas.

**Setup**
```js
// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  "pt-BR": { translation: { title: "Orçamento de Emoldurado", markup: "Markup (%)", /* ... */ }},
  "en-US": { translation: { title: "Framing Quote", markup: "Markup (%)", /* ... */ }},
};

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: "pt-BR",
  lng: "pt-BR",
  interpolation: { escapeValue: false },
});

export default i18n;
```
No `main.jsx`, apenas `import "./i18n"` e usar `t("title")` nas labels.

**DoD**
- Texto alterna PT/EN.
- Moeda/numeração acompanham locale.
- Sem strings hardcoded nas telas principais.

---

### Ordem sugerida de entrega
1) Tabela de composição
2) PDF
3) Cache
4) i18n

## Licença

Uso interno da Arte Moldurados (ou a licença que você desejar anexar aqui).
