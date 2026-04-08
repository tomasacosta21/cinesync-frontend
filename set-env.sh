#!/bin/bash
# Genera environment.production.ts en tiempo de build usando variables de Netlify.
# Este script corre ANTES de ng build en el pipeline de Netlify.
# El archivo generado nunca se commitea al repositorio.

cat > src/environments/environment.production.ts << ENVEOF
export const environment = {
  production: true,
  apiUrl: '${API_URL}'
};
ENVEOF

echo "environment.production.ts generado con apiUrl: ${API_URL}"
