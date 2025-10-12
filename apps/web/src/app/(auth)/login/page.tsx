import { Suspense } from "react";

import LoginPage from "./login_page";

export const dynamic = "force-dynamic";

export default function LoginRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-text-muted">Cargando...</div>}>
      <LoginPage />
    </Suspense>
  );
}

