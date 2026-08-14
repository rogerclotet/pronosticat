# Pronosticat

PWA per pronosticar futbol amb amics. Cada jornada porta un tauler de reptes — el resultat exacte, la golejada, la pallissa, la màquina de gols — i cada casella es gasta apuntant-la a un partit o a un equip. Per LaLiga, Premier League o Champions League.

## Stack

- **Next.js 16** (App Router)
- **Tailwind CSS 4** — disseny brutalista mobile-first
- **Drizzle ORM** + PostgreSQL
- **Better Auth** — Google OAuth + magic link
- **next-intl** — localització (Català)
- **football-data.org** — dades de partits

## Docker

### Desenvolupament local

Tot l'stack en Docker (PostgreSQL + migració + app amb hot reload):

```bash
cp .env.example .env
npm run docker:dev:full
```

L'app queda disponible a `http://localhost:3000` (o el port definit a `APP_PORT`).

Alternativa només PostgreSQL (app amb `npm run dev` a l'host):

```bash
cp .env.example .env
# DATABASE_URL=postgresql://pronosticat:pronosticat@localhost:5432/pronosticat
npm run docker:dev:db
npm run db:migrate
npm run dev
```

### Producció

Configura `.env` amb secrets reals. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `POSTGRES_PASSWORD` i `CRON_SECRET` són obligatoris (el compose de producció no arrenca sense ells). `BETTER_AUTH_URL` ha de ser l'URL pública HTTPS. Arrenca:

```bash
npm run docker:prod
```

Això construeix la imatge Next.js, aplica les migracions pendents, engega l'app a `http://localhost:3000` (o `APP_PORT`) i un servei `cron` que sincronitza partits cada 10 minuts. El contenidor exposa `/api/health` per al healthcheck. El compose publica HTTP: el TLS el porta el reverse proxy.

```bash
npm run docker:prod:logs   # veure logs
npm run docker:prod:down   # aturar
```

### Desplegament continu

Cada push a `main` que passi `lint`+`typecheck`+`test` (`.github/workflows/ci.yml`) desplega el **commit exacte** via SSH (`scripts/deploy.sh`): `git fetch` + reset al SHA de CI, després `docker compose --wait`. També es pot relançar a mà amb `workflow_dispatch`.

El servidor ha de tenir el repositori clonat, Docker, i un `.env` de producció (compose el llegeix sol).

**Clau SSH (un cop):**

```bash
ssh-keygen -t ed25519 -f github-deploy -N "" -C "pronosticat-github-deploy"
# Clau pública → ~/.ssh/authorized_keys de l'usuari SSH al servidor
# Clau privada → secret SSH_PRIVATE_KEY de GitHub

ssh-keyscan -H YOUR_SERVER_HOST
# Enganxa la sortida al secret SSH_KNOWN_HOSTS (no desactivis la verificació del host)
```

Secrets del repositori:

| Secret | Descripció |
|---|---|
| `SSH_PRIVATE_KEY` | Clau privada Ed25519 (substitueix `SSH_PASSWORD`) |
| `SSH_KNOWN_HOSTS` | Sortida de `ssh-keyscan -H <host>` |
| `SSH_USERNAME` | Usuari SSH |
| `SSH_HOST` | Host o IP (`SSH_IP` encara s'accepta com a àlies) |
| `SSH_PROJECT_DIRECTORY` | Ruta del clone al servidor |
| `PORT` | Port públic de l'app (`APP_PORT`) |
| `SSH_PORT` | Opcional, per defecte 22 |

Treu `SSH_PASSWORD` dels secrets un cop la clau funcioni.

### Copies de seguretat

En producció un sidecar (`postgres:16-alpine`) fa un `pg_dump --format=custom` en arrencar i després cada 24 h. Els fitxers queden a `./backups` (o `POSTGRES_BACKUP_DIR`) **al disc del servidor**, amb retenció de 14 dies (sempre se'n queden 3 com a mínim).

```bash
npm run docker:prod:backup                          # dump manual
DB_RESTORE_CONFIRM=yes npm run docker:prod:restore -- backups/pronosticat-YYYYMMDDTHHMMSSZ.dump
```

El restore atura l'app, aplica el dump amb `pg_restore --clean`, i la torna a engegar. El fitxer ha de ser dins del directori de backups (el contenidor de Postgres el munta a `/backups`).

Això no treu la necessitat d'una còpia fora de la màquina: rsync/restic cap a un altre disc o bucket. `docker compose down -v` esborra el volum de Postgres però **no** el bind mount de `./backups`.

## Configuració

1. Copia les variables d'entorn:

```bash
cp .env.example .env.local
```

2. Configura les variables:

| Variable | Descripció |
|---|---|
| `DATABASE_URL` | URL de connexió PostgreSQL |
| `BETTER_AUTH_SECRET` | Clau secreta (mín. 32 caràcters) |
| `BETTER_AUTH_URL` | URL de l'app (ex: `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `RESEND_API_KEY` | Per enviar magic links |
| `EMAIL_FROM` | Correu remitent |
| `FOOTBALL_DATA_API_KEY` | API key de football-data.org |
| `CRON_SECRET` | Secret per l'endpoint de sincronització |
| `CRON_SCHEDULE` | Expressió cron del servei Compose (per defecte `*/10 * * * *`) |

3. Aplica les migracions de base de dades:

```bash
npm run db:migrate
```

Per canvis d'esquema nous: edita `src/lib/db/schema.ts`, genera una migració amb `npm run db:generate`, i després `npm run db:migrate`. Per esborrar tot i tornar a començar (només dev / reset intencionat):

```bash
DB_RESET_CONFIRM=yes npm run db:reset
```

4. Inicia el servidor de desenvolupament:

```bash
npm run dev
```

## Estructura de navegació

- **Jugades** — El tauler de reptes de la jornada: hi fas i edites les teves jugades, més l'historial de jornades anteriors
- **Jornada** — Els partits de la jornada i el seu resultat, només per consultar
- **Classificació** — Ranking del grup amb estadístiques
- **Grup** — Gestiona i canvia entre grups

## Sistema de joc

Cada jornada és un **tauler de 5 reptes**. Jugar una casella és gratis, però només la
pots gastar un cop: hi apuntes **un partit** o **un equip** de la jornada.

| Repte | Objectiu | Regla | Premi / càstig |
| --- | --- | --- | --- |
| La porra | partit + resultat | Clava el resultat exacte | +100 exacte · +25 només 1X2 · −25 |
| La golejada | partit | El partit amb més gols de la jornada | +80 |
| La pallissa | partit | El partit amb més diferència de gols | +80 |
| La màquina | equip | L'equip que marca més gols de la jornada | +80 |
| El segur | equip | Un equip que guanya | +40 / −40 |

A més, cada jornada inclou **un repte extra** triat a l'atzar d'un pool rotatiu (El rotllo, La sorpresa, El comptador, etc.) — 6 caselles en total. Només **La porra** i **El segur** resten punts si falles; la resta de caselles només sumen.

- Cada jugador comença amb punts inicials (per defecte 1000).
- Un **jòquer** per jornada dobla el premi i el càstig de la jugada on el poses.
- Si empaten dos partits (o dos equips) al capdamunt, **totes les jugades empatades encerten**.
- Tot el tauler **es tanca al primer xiulet de la jornada**: un sol termini per a tothom.
- Els punts es mouen **només quan la jornada es liquida**, un cop jugats tots els partits.
  Si algun queda ajornat, la jornada es liquida igualment 48 h després de l'últim
  partit programat, comptant només el que s'ha jugat.

Els reptes viuen a `src/lib/challenges/definitions/` com a funcions pures; afegir-ne un
és un fitxer nou més el seu test.

## Sincronització

L'endpoint `/api/cron/sync` sincronitza partits des de football-data.org, crea els taulers de la jornada, els bloqueja i els liquida. El servei Compose `cron` el truca per la xarxa interna (`http://app:3000`) cada 10 minuts i un cop en arrencar, amb `Authorization: Bearer <CRON_SECRET>`. No cal crontab al servidor; el pròxim `docker compose up` ja l'engega. Si encara tens un crontab manual, treu-lo perquè no es dupliquin les crides.

Només es sincronitzen competicions amb grups actius (no totes les lligues configurades). Les pàgines llegeixen partits des de la base de dades; l'API externa només s'usa al cron.

**Pla gratuït de football-data.org:** màxim 10 crides/minut. L'app limita internament a 8 crides/minut i reintenta un cop davant un 429.

L'interval per defecte (`*/10 * * * *`) està dins del rang recomanat en dies de partit. Es pot canviar amb `CRON_SCHEDULE` al `.env`:

| Context | Interval |
| --- | --- |
| Dies de partit (jornada en curs) | Cada 5–10 minuts |
| Fora de temporada / sense partits | Cada 30–60 minuts |
| Mínim segur | No més ràpid que 1/min si tens 3+ competicions actives |

```bash
docker compose -f compose.yaml -f compose.prod.yaml logs -f cron
```

## Proves manuals (dev fixtures)

En desenvolupament (`NODE_ENV=development`) pots crear partits ficticis i simular el cicle complet d'una jornada sense esperar a la temporada real ni cridar football-data.org.

Obre **`/dev/fixtures`** al navegador per usar la pàgina d'administració visual (recomanat). També pots usar els endpoints API directament amb curl.

### Flux recomanat

1. Crea un grup per a la competició que vols provar (ex. LaLiga).
2. Crea **diversos** partits de prova amb el mateix `matchday` (una jornada necessita més
   d'un partit perquè «la golejada» o «la pallissa» tinguin sentit). Kickoff d'aquí a 1
   hora per defecte:

```bash
curl -X POST http://localhost:3000/api/dev/fixtures \
  -H "Content-Type: application/json" \
  -d '{
    "competition": "laliga",
    "homeTeam": "Equip A",
    "awayTeam": "Equip B",
    "matchday": 1
  }'
```

3. Prem **Run scoring** a `/dev/fixtures` (o `POST /api/dev/score`) per crear el tauler
   de la jornada. Hauria d'aparèixer a la secció **Rounds** amb 5 reptes i estat `open`.
4. Obre l'app i omple les 5 caselles, amb el jòquer en una.
5. Prem **Lock round** a la jornada (mou tots els kickoffs al passat i executa el scoring).
   El tauler passa a `locked` i ja no es pot tocar. **No es descompta res.**
6. Posa el resultat final de cada partit amb **Finish & score**:

```bash
curl -X PATCH "http://localhost:3000/api/dev/fixtures/MATCH_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "finished",
    "homeScore": 2,
    "awayScore": 1,
    "runScore": true
  }'
```

7. Quan l'últim partit acaba, la jornada passa a `settled` i els punts s'assignen de cop.
   Refresca l'app per veure el resultat de cada casella.

### Endpoints dev

| Mètode | Ruta | Descripció |
| --- | --- | --- |
| `GET` | `/api/dev/fixtures` | Llista partits ficticis (`?competition=laliga` opcional) |
| `POST` | `/api/dev/fixtures` | Crea un partit fictici |
| `PATCH` | `/api/dev/fixtures/[matchId]` | Actualitza estat, resultat o kickoff. Passa `"runScore": true` per executar el cicle de jornades |
| `DELETE` | `/api/dev/fixtures/[matchId]` | Elimina un partit fictici |
| `POST` | `/api/dev/score` | Executa el cicle de jornades (crea taulers + bloqueja + liquida) sense sync amb l'API externa |

Els partits ficticis tenen `externalId` negatiu per distingir-los dels partits reals. Només es poden modificar o eliminar aquests partits.

La pàgina `/dev/fixtures` i les server actions només funcionen en `NODE_ENV=development`. En producció els endpoints `/api/dev/*` retornen 404 tret que `DEV_FIXTURES_ENABLED=true` **i** hi hagi `DEV_FIXTURES_SECRET` o `CRON_SECRET`. Llavors cal `Authorization: Bearer <secret>`.

## Tests automatitzats

```bash
npm run test
```

Els tests unitaris cobreixen:

- Cada repte del tauler (encert, fallada, empat al capdamunt, objectiu no jugat)
- El doblatge del jòquer (`scoreEntry`)
- Validació de jugades (`normalizeTarget`)
- Quan una jornada es pot liquidar (`isRoundSettleable`, període de gràcia)
- Client football-data.org (fetch mockat, retry 429, mapatge d'estats)
- Sync de partits cap a la BD (API mockada)

### Tests d'integració amb Postgres

`src/lib/rounds/settlement.integration.test.ts` executa el cicle complet
(crear tauler → bloquejar → liquidar → classificació) contra un Postgres real. Es salta per defecte;
per activar-lo cal una base de dades d'usar i llençar, perquè **fa `truncate` de les taules**:

```bash
docker run -d --name pg -e POSTGRES_USER=p -e POSTGRES_PASSWORD=p \
  -e POSTGRES_DB=p -p 55099:5432 postgres:16-alpine
DATABASE_URL=postgresql://p:p@localhost:55099/p npx drizzle-kit migrate
RUN_DB_TESTS=1 DATABASE_URL=postgresql://p:p@localhost:55099/p npm run test
```

## PWA

L'app es pot instal·lar com a PWA en dispositius mòbils. El manifest i service worker es generen automàticament en producció.
