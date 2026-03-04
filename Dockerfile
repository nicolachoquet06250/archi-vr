# Étape 1 : Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copier les fichiers de définition de package
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code source
COPY . .

# Construire l'application Nuxt
RUN npm run build

# Étape 2 : Production
FROM node:22-alpine AS runner

WORKDIR /app

# Définir l'environnement de production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copier uniquement la sortie du build
COPY --from=builder /app/output ./.output

# Exposer le port par défaut
EXPOSE 3000

# Lancer l'application
CMD ["node", ".output/server/index.mjs"]
