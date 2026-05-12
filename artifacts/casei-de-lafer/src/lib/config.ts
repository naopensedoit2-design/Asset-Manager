function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  cloudinary: {
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    apiSecret: requireEnv("CLOUDINARY_API_SECRET"),
  },

  admin: {
    passwordHash: requireEnv("ADMIN_PASSWORD_HASH"),
  },

  session: {
    secret: requireEnv("SESSION_SECRET"),
    cookieName: "casei_admin_session",
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },

  whatsapp: {
    number: optionalEnv("WHATSAPP_NUMBER", "5554999999999"),
  },

  nodeEnv: optionalEnv("NODE_ENV", "development"),
} as const;
