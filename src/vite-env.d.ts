/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly GEMINI_API_KEY?: string;
    readonly VITE_API_URL?: string;
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_SUPABASE_STORAGE_BUCKET?: string;
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
    readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
    readonly VITE_EMAIL_VERIFY_ENDPOINT?: string;
    readonly VITE_EMAIL_VERIFY_FUNCTION_URL?: string;
    readonly VITE_QUOTE_EMAIL_SETTINGS_FUNCTION_URL?: string;
    readonly VITE_QUOTE_REQUEST_NOTIFY_FUNCTION_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
