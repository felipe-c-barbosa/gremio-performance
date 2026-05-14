# Grêmio no Brasileirão — comparativo

Dashboard estático (Next.js + Recharts) que compara a campanha do **Grêmio** no **Brasileirão Série A** de **2026** com **2020, 2021, 2023, 2024 e 2025** (2022 fora por ter sido na Série B).

## Dados

| Fonte | Uso |
|--------|-----|
| [openfootball/south-america](https://github.com/openfootball/south-america/tree/master/brazil) (`YYYY_br1.txt`) | Temporadas históricas e **2026** quando o arquivo TXT está atualizado. |
| [campeonato-brasileiro-api](https://www.npmjs.com/package/campeonato-brasileiro-api) + Globo Esporte | Fallback no script `update-current` quando o TXT de 2026 ainda não reflete a última rodada. |
| **SofaScore** (`api.sofascore.com`) + **FotMob** (`www.fotmob.com/api`) | Notas por jogo (time) — **sem API pública oficial**; uso educacional, com rate-limit e cache local. |

Os JSON em `data/` são versionados no Git. A posição na tabela por rodada é simulada a partir de **todos** os jogos do campeonato (não só do Grêmio).

### Notas por rodada (SofaScore / FotMob)

Cada entrada em `data/{ano}.json` pode ter `rating` (0–10), `ratingSource` (`sofascore` \| `fotmob`) e, no `summary`, `averageRating` e `ratingsCovered`.

- **Histórico (2020, 2021, 2023, 2024, 2025)** — rode localmente (muitos IPs de datacenter recebem 403 do Cloudflare):

  ```bash
  npm run seed:ratings
  ```

  Anos opcionais: `SEED_RATINGS_YEARS=2023,2024` (vírgula, sem espaços obrigatórios). Para testar poucas rodadas: `SEED_RATINGS_MAX_ROUNDS=3`.

  Um snapshot por ano é gravado em `cache/ratings/{ano}.json` (pasta `cache/` está no `.gitignore`).

- **2026** — o mesmo `npm run update:current` tenta preencher notas faltantes de forma idempotente (não sobrescreve rating já salva). Se a API falhar, o job **não** quebra: só faltam pontos no gráfico.

- **Desligar busca de notas** (só pontos / posição), por exemplo no GitHub Actions:

  ```bash
  set SOFASCORE_RATINGS_DISABLED=1   # Windows CMD
  # ou: $env:SOFASCORE_RATINGS_DISABLED="1"   # PowerShell
  ```

**Termos / responsabilidade:** SofaScore e FotMob não oferecem API estável para terceiros. Não revenda nem abuse do tráfego; respeite os termos dos sites. Uso comercial exige acordo próprio (ex.: produtos oficiais / licenciamento).

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

Popular notas nas temporadas históricas já commitadas (rede + paciência; ver tabela acima):

```bash
npm run seed:ratings
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
