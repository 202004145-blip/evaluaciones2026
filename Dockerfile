# Imagen para desplegar la app (DISC + IPV) en Railway o cualquier host con Docker.
# Un solo proceso Express sirve la API y los estáticos; la base SQLite vive en
# un volumen persistente montado en /data (ver railway.json / DB_PATH).
FROM node:22-bookworm-slim

ENV NODE_ENV=production

# Herramientas de compilación por si better-sqlite3 no encuentra un binario
# precompilado para esta versión de Node (fallback: lo compila desde la fuente).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias primero para aprovechar la caché de capas.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiar el resto del código.
COPY . .

# Carpeta por defecto para el volumen persistente (DB_PATH=/data/data.sqlite).
RUN mkdir -p /data

# Railway inyecta PORT; el server ya usa process.env.PORT || 3000.
EXPOSE 3000

CMD ["npm", "start"]
