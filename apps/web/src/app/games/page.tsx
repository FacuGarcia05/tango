import { Suspense } from "react";

import GamesPage from "./games_page";

export const dynamic = "force-dynamic";

export default function GamesRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-text-muted">Cargando catalogo...</div>}>
      <GamesPage />
    </Suspense>
  );
}

