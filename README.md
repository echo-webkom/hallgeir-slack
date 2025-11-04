# Hallgeir

Slack-bot for å hjelpe med økonomi-søknader til Hovedstyret i echo -
Linjeforeningen for Informatikk ved UiB.

## Hvordan kjøre

For å kjøre applikasjonen trenger du Deno og Docker installert.

1. Start postgres-databasen:

   ```sh
   docker-compose up -d
   ```

2. Kjør boten:

   ```sh
   deno task dev
   ```

## Deployment

Vi deployer for tiden applikasjonen på en Railway-instans. For å deployere, push
til `main`-grenen, og Railway vil automatisk bygge og deployere applikasjonen.

## Annet

Du kan også kjøre database-migreringene uten å starte boten:

```sh
deno task db:migrate
```
