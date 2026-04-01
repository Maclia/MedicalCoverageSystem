/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_GATEWAY_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_CORE_SERVICE_URL: string;
  readonly VITE_BILLING_SERVICE_URL: string;
  readonly VITE_CRM_SERVICE_URL: string;
  readonly VITE_INSURANCE_SERVICE_URL: string;
  readonly VITE_HOSPITAL_SERVICE_URL: string;
  readonly VITE_FINANCE_SERVICE_URL: string;
  readonly VITE_MEMBERSHIP_SERVICE_URL: string;
  readonly VITE_WELLNESS_SERVICE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
