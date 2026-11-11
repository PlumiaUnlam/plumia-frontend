# PlumIA Frontend

Aplicación web de PlumIA, construida con Next.js. El proyecto se ejecuta en el puerto `3001` y necesita un backend NestJS disponible, normalmente en `http://localhost:3000`.

## Probar la aplicación desplegada

**[Abrir PlumIA](https://plumia-frontend.vercel.app/)**

## Inicio local rápido

Se necesita Node.js 22.x y pnpm 9.15.0. Para configurar y levantar la aplicación completa, primero seguí la [guía de instalación y uso del proyecto](https://github.com/PlumiaUnlam/plumia-backend#plumia), que explica cómo clonar ambos repositorios, configurar Firebase y levantar el backend y sus servicios.

Con el backend en ejecución, desde esta carpeta:

```bash
cp .env.example .env.local
```

Completá en `.env.local` los valores `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` y `NEXT_PUBLIC_FIREBASE_PROJECT_ID` de la aplicación web registrada en Firebase. Para el backend local, mantené `NEXT_PUBLIC_API_URL=/api` y `API_URL=http://localhost:3000`.

Después instalá dependencias y levantá Next.js:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Abrí [http://localhost:3001](http://localhost:3001). Las variables con prefijo `NEXT_PUBLIC_` se incorporan al frontend; reiniciá el servidor si las cambiás.

## Comandos de desarrollo

```bash
pnpm lint
pnpm exec tsc --noEmit --pretty false
pnpm build
```

Para los recorridos E2E de Playwright, instalá Chromium una vez y ejecutá:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```
