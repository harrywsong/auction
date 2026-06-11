/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_API_URL: string;
    readonly VITE_ADMIN_PASSWORD: string;
    readonly VITE_ADMIN_KEY: string;
    [key: string]: any;
  };
}
