// Configuração do WhatsApp (API oficial da Meta). Tudo vem de variáveis de ambiente na Vercel.

export function waConfig() {
  const env = (k: string) => (process.env[k] ?? "").trim();
  return {
    token: env("WHATSAPP_TOKEN"),
    phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
    appSecret: env("WHATSAPP_APP_SECRET"),
    verifyToken: env("WHATSAPP_VERIFY_TOKEN"),
    wabaId: env("WHATSAPP_WABA_ID"),
    ownerTemplate: env("WHATSAPP_OWNER_TEMPLATE") || "aviso_margot",
    templateLang: env("WHATSAPP_TEMPLATE_LANG") || "pt_BR",
    graphVersion: env("WHATSAPP_GRAPH_VERSION") || "v25.0",
    apiBase: (env("WHATSAPP_API_BASE") || "https://graph.facebook.com").replace(/\/$/, ""),
  };
}

const REQUIRED = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"] as const;

/** Variáveis obrigatórias que ainda faltam na Vercel. */
export function waMissing(): string[] {
  return REQUIRED.filter((k) => !(process.env[k] ?? "").trim());
}

/** Pronto para mandar mensagens. */
export function waCanSend(): boolean {
  const c = waConfig();
  return Boolean(c.token && c.phoneNumberId);
}
