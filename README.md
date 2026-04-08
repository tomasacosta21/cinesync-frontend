# CineSync — Frontend Angular

Sistema de reserva de butacas en tiempo real. Consume la API REST + SSE del backend Spring Boot.

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar en desarrollo (requiere backend corriendo en :8080)
npm start
# → http://localhost:4200

# 3. Build de producción
npm run build:prod
# → dist/cinesync-frontend/browser/
```

## Variables de entorno

Antes del deploy a Netlify, editá `src/environments/environment.production.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://TU-APP.up.railway.app/api'
};
```

## Estructura

```
src/app/
├── core/
│   ├── models/sala.model.ts       ← tipos TypeScript
│   ├── services/sala.service.ts   ← HTTP a la API REST
│   └── services/sse.service.ts    ← Server-Sent Events
├── pages/
│   ├── sala-list/                 ← listado de las 3 salas
│   └── sala-detail/               ← sala con grilla interactiva
├── app.config.ts
├── app.routes.ts
└── app.component.ts
```

## Conceptos de concurrencia visibles en el frontend

- **SSE en tiempo real**: cada cambio de estado de una butaca se propaga a todos los clientes conectados.
- **Botón "Simular race condition"**: lanza 15 peticiones simultáneas sobre la misma butaca. El backend (ReentrantLock + CAS) garantiza que solo 1 gana.
- **Reconexión automática**: si el SSE se corta, el frontend reconecta solo cada 3 segundos.
