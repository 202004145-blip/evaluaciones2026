# Imagen para desplegar la app (DISC + IPV + Cleaver) en Railway o cualquier
# host con Docker. Un solo proceso Express sirve la API y los estáticos; la base
# SQLite vive en un volumen persistente montado en /data (ver railway.json /
# DB_PATH).

# --- Etapa 1: compilar la app Cleaver (React/Vite) a estáticos ---------------
# Se compila con base '/cleaver/' para servirse montada en esa ruta desde
# Express. Su dist/ se copia a la imagen final en la etapa 2.
FROM node:22-bookworm-slim AS cleaver-build
WORKDIR /cleaver
COPY cleaver-app/package.json cleaver-app/package-lock.json ./
RUN npm ci
COPY cleaver-app/ ./
RUN npm run build

# --- Etapa 2: runtime del servidor Express -----------------------------------
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

# Copiar el build de Cleaver generado en la etapa 1 (sobrescribe cualquier
# dist/ que hubiera venido del contexto).
COPY --from=cleaver-build /cleaver/dist ./cleaver-app/dist

# Carpeta por defecto para el volumen persistente (DB_PATH=/data/data.sqlite).
RUN mkdir -p /data

# Railway inyecta PORT; el server ya usa process.env.PORT || 3000.
EXPOSE 3000

CMD ["npm", "start"]
