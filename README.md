# Hallgeir

Slack-bot for å hjelpe med økonomi-søknader til Hovedstyret i echo - Linjeforeningen for Informatikk ved UiB.

## How to run

To run the application you need Deno and Docker installed.

1. Start the postgres database:

   ```sh
   docker-compose up -d
   ```

2. Run the bot:

   ```sh
   deno task dev
   ```

## Deployment

I currently deploy the application on a Railway instance. To deploy, push to the `main` branch and Railway will automatically build and deploy the application.

## Other

You can also run the database migrations without starting the bot:

```sh
deno task db:migrate
```
