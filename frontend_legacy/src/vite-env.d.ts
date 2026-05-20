/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_AI_SERVICE_URL?: string;
  readonly VITE_API_TARGET?: string;
  readonly VITE_REQUIRE_UCU_EMAIL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly REACT_APP_API_URL?: string;
  readonly REACT_APP_AI_SERVICE_URL?: string;
  readonly REACT_APP_REQUIRE_UCU_EMAIL?: string;
  readonly REACT_APP_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
