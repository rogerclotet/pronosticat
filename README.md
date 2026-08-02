# Pronosticat

PWA per pronosticar resultats de futbol amb amics. Crea grups, aposta punts i competeix per LaLiga, Premier League o Champions League.

## Stack

- **Next.js 16** (App Router)
- **Tailwind CSS 4** — disseny brutalista mobile-first
- **Drizzle ORM** + PostgreSQL
- **Better Auth** — Google OAuth + magic link
- **next-intl** — localització (Català)
- **football-data.org** — dades de partits

## Docker

### Desenvolupament local

Només PostgreSQL (recomanat: app amb `npm run dev` a l'host):

```bash
cp .env.example .env
npm run docker:dev:db
npm run db:push
npm run dev
```

Amb `DATABASE_URL=postgresql://pronosticat:pronosticat@localhost:5432/pronosticat`.

Tot l'stack en Docker (hot reload):

```bash
cp .env.example .env
npm run docker:dev:full
```

### Producció

Configura `.env` amb secrets reals (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, etc.) i arrenca:

```bash
npm run docker:prod
```

Això construeix la imatge Next.js, aplica l'esquema de base de dades i engega l'app a `http://localhost:3000` (o `APP_PORT`).

```bash
npm run docker:prod:logs   # veure logs
npm run docker:prod:down   # aturar
```

### Desplegament continu

Cada push a `main` que passi `lint`+`typecheck` (`.github/workflows/ci.yml`) desplega automàticament via SSH (`scripts/deploy.sh`): fa `git pull` al servidor i `docker compose -f compose.yaml -f compose.prod.yaml up -d --build --remove-orphans`.

Cal configurar aquests secrets al repositori de GitHub:

| Secret | Descripció |
|---|---|
| `SSH_PASSWORD` | Contrasenya SSH del servidor |
| `SSH_USERNAME` | Usuari SSH |
| `SSH_IP` | IP o host del servidor |
| `SSH_PROJECT_DIRECTORY` | Ruta del repositori clonat al servidor |
| `PORT` | Port públic de l'app (`APP_PORT`) |

El servidor ha de tenir el repositori clonat amb un `.env` de producció ja configurat (docker compose el llegeix automàticament).

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

3. Aplica l'esquema de base de dades:

```bash
npm run db:push
```

4. Inicia el servidor de desenvolupament:

```bash
npm run dev
```

## Estructura de navegació

- **Inici** — Resum de grups, punts i pròxims partits
- **Pronòstics** — Partits de la jornada actual amb les teves prediccions
- **Classificació** — Ranking del grup amb estadístiques
- **Grup** — Gestiona i canvia entre grups

## Sistema de punts

- Cada jugador comença amb punts inicials (per defecte 1000)
- Aposta entre 10 i 500 punts per partit
- Els punts es descompten quan el partit comença
- Resultat exacte: 3x l'aposta
- Resultat parcial (1X2 correcte): 1x l'aposta
- Resultat incorrecte: 0 punts

## Sincronització

L'endpoint `/api/cron/sync` sincronitza partits des de football-data.org, bloqueja prediccions i assigna punts. Configura un cron job amb el header `Authorization: Bearer <CRON_SECRET>`.

## PWA

L'app es pot instal·lar com a PWA en dispositius mòbils. El manifest i service worker es generen automàticament en producció.
