# Grêmio no Brasileirão — comparativo

Dashboard estático (Next.js + Recharts) que compara a campanha do **Grêmio** no **Brasileirão Série A** de **2026** com **2020, 2021, 2023, 2024 e 2025** (2022 fora por ter sido na Série B).

## Dados

| Fonte | Uso |
|--------|-----|
| [openfootball/south-america](https://github.com/openfootball/south-america/tree/master/brazil) (`YYYY_br1.txt`) | Temporadas históricas e **2026** quando o arquivo TXT está atualizado. |
| [campeonato-brasileiro-api](https://www.npmjs.com/package/campeonato-brasileiro-api) + Globo Esporte | Fallback no script `update-current` quando o TXT de 2026 ainda não reflete a última rodada. |
| **Elo (cálculo local)** | Reprocessa todos os jogos da Série A desde **2018** (warm-up) com o método descrito em [Yuri Malheiros — Elo Brasileirão](https://www.yurimalheiros.com/elo-brasileirao/) (K=20, rating inicial 1000, sem mando). O Elo do Grêmio em **2022** não muda (não disputou a Série A); os outros times continuam a ser atualizados. |

Os JSON em `data/` são versionados no Git. A posição na tabela por rodada é simulada a partir de **todos** os jogos do campeonato (não só do Grêmio). Cada rodada pode incluir `leagueAveragePoints`: média de pontos acumulados dos **outros 19 times** após essa rodada (usada no gráfico "Desempenho vs. média da Série A").

### Elo por rodada

Cada rodada em `data/{ano}.json` pode ter `elo` (número). No `summary`: `averageElo`, `eloCovered`, `finalElo`.

- **Histórico (2020, 2021, 2023, 2024, 2025)** — após alterar jogos no OpenFootball ou regenerar com `seed:historical`, rode:

  ```bash
  npm run seed:elo
  ```

  Anos opcionais: `SEED_ELO_YEARS=2023,2024` (vírgula). Um snapshot auxiliar é gravado em `cache/elo/seasons.json` (pasta `cache/` no `.gitignore`).

- **2026** — cada execução de `npm run update:current` recalcula o mapa de Elo até 2026 e preenche as rodadas do JSON. Quando o fallback usa só a API da Globo (OpenFootball atrasado), `leagueAveragePoints` das rodadas novas pode ficar ausente até o TXT atualizar; valores anteriores são preservados no merge.

O warm-up começa em **2018** (primeiro ano com `*_br1.txt` no repositório OpenFootball usado aqui), não em 2003 como na página do Yuri; por isso os valores finais podem diferir alguns pontos das tabelas dele, mas a metodologia é a mesma.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Gerar de novo os JSONs históricos (2020, 2021, 2023, 2024, 2025) **com Elo**:

```bash
npm run seed:historical
```

Atualizar só `data/2026.json` (rede necessária):

```bash
npm run update:current
```

Só recalcular Elo nos JSONs já existentes (sem refetch do OpenFootball):

```bash
npm run seed:elo
```

Build de produção (gera `out/` para export estático):

```bash
npm run build
```

## Deploy (Netlify)

1. Repositório no GitHub (público ou privado com Netlify Pro).
2. No Netlify: **Add new site** → **Import an existing project** → conecte o repo.
3. Configuração detectada via [`netlify.toml`](netlify.toml):
   - **Build command:** `npm run build`
   - **Publish directory:** `out`
4. Variável recomendada em produção: **`NEXT_PUBLIC_SITE_URL`** — URL canónica (ex. `https://seu-dominio.netlify.app`, sem barra final). Usada em `robots.txt`, `sitemap.xml` e `metadataBase` (Open Graph). Sem ela, o build usa `http://localhost:3000` (ok para desenvolvimento).

### SEO (`robots.txt` e `sitemap.xml`)

O Next gera em `out/`:

- **`robots.txt`** — `User-agent: *` + `Allow: /` + linha `Sitemap:` com URL absoluta (boas práticas Google).
- **`sitemap.xml`** — lista a página inicial com `changefreq: weekly`, `priority: 1` e `lastmod` no build.

Com `output: "export"`, os ficheiros [`src/app/robots.ts`](src/app/robots.ts) e [`src/app/sitemap.ts`](src/app/sitemap.ts) usam `export const dynamic = "force-static"`. A base vem de [`src/lib/site.ts`](src/lib/site.ts).

Cada push na branch de produção (ex.: `main`) dispara um novo deploy.

## Atualização automática da temporada 2026

O workflow [`.github/workflows/update-data.yml`](.github/workflows/update-data.yml) roda **terça e sexta às 10:00 (BRT)** (cron) e em **workflow_dispatch** manual:

1. Executa `npm test` (parser OpenFootball).
2. Executa `npm run update:current`.
3. Executa `npm run healthcheck:2026` (falha se JSON estiver atrás da GE ou parser quebrado).
4. Se `data/2026.json` mudar, faz commit e push.
5. O Netlify detecta o push e refaz o build.

> **Permissões:** em *Settings → Actions → General → Workflow permissions*, deixe **Read and write** para o `GITHUB_TOKEN` poder fazer push no mesmo repositório.

## Licença dos dados

Datasets OpenFootball: [CC0](https://github.com/openfootball/south-america/blob/master/LICENSE.md). Respeite os termos de uso do site da Globo ao usar o fallback de scraping. O método Elo explicado em [yurimalheiros.com](https://www.yurimalheiros.com/elo-brasileirao/) é referência metodológica; a implementação e os números gerados neste repositório são responsabilidade do projeto.
