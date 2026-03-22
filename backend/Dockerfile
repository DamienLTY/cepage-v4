FROM node:20-alpine

# Python3 pour les scripts de scraping (scrape_exposants.py, scrape_medoc.py, ocr.py)
RUN apk add --no-cache python3 py3-pip python3-dev gcc musl-dev libpq-dev
RUN pip3 install --no-cache-dir psycopg2-binary python-dotenv --break-system-packages

WORKDIR /app

# Dépendances Node.js
COPY package*.json ./
RUN npm ci --omit=dev

# Schéma Prisma + génération client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Code source
COPY src/ ./src/

# Scripts Python de scraping
COPY *.py ./
COPY event_sources.json ./

# Dossier JSON publics (exposants-*.json, events_dynamic.json)
RUN mkdir -p /data/public

EXPOSE 5000

# Au démarrage : activer unaccent + push schema Prisma + lancer serveur
CMD sh -c "npx prisma db push --skip-generate && node src/server.js"
