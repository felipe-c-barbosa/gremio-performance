# Grêmio no Brasileirão — comparativo

Dashboard estático (Next.js + Recharts) que compara a campanha do **Grêmio** no **Brasileirão Série A** de **2026** com **2020, 2021, 2023, 2024 e 2025** (2022 fora por ter sido na Série B).

## Dados

| Fonte | Uso |
|--------|-----|
| [openfootball/south-america](https://github.com/openfootball/south-america/tree/master/brazil) (`YYYY_br1.txt`) | Temporadas históricas e **2026** quando o arquivo TXT está atualizado. |
| [campeonato-brasileiro-api](https://www.npmjs.com/package/campeonato-brasileiro-api) + Globo Esporte | Fallback no script `update-current` quando o TXT de 2026 ainda não reflete a última rodada. |

Os JSON em `data/` são versionados no Git. A posição na tabela por rodada é simulada a partir de **todos** os jogos do campeonato (não só do Grêmio).

## Desenvolvimento local

```bash
npm install
npm run dev
```

Gerar de novo os JSONs históricos (2020, 2021, 2023, 2024, 2025):

```bash
npm run seed:historical
```

Atualizar só `data/2026.json` (rede necessária):

```bash
npm run update:current
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
4. Variável opcional: nenhuma obrigatória.

Cada push na branch de produção (ex.: `main`) dispara um novo deploy.

## Atualização automática da temporada 2026

O workflow [`.github/workflows/update-data.yml`](.github/workflows/update-data.yml) roda **3x por semana** (cron) e em **workflow_dispatch** manual:

1. Executa `npm run update:current`.
2. Se `data/2026.json` mudar, faz commit e push.
3. O Netlify detecta o push e refaz o build.

> **Permissões:** em *Settings → Actions → General → Workflow permissions*, deixe **Read and write** para o `GITHUB_TOKEN` poder fazer push no mesmo repositório.

## Licença dos dados

Datasets OpenFootball: [CC0](https://github.com/openfootball/south-america/blob/master/LICENSE.md). Respeite os termos de uso do site da Globo ao usar o fallback de scraping.
