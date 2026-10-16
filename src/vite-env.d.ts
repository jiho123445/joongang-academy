/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  readonly VITE_ACADEMY_ADMIN_API_KEY?: string;
  readonly VITE_INQUIRY_INBOX_URL?: string;
  readonly VITE_PROSPECT_INQUIRY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
