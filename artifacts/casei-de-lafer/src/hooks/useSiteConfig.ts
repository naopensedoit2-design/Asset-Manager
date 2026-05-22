import { useQuery } from "@tanstack/react-query";

interface SiteConfig {
  whatsappNumber: string;
  weddingCount: number;
  driverQuote: string;
  showCalendar: boolean;
}

async function fetchSiteConfig(): Promise<SiteConfig> {
  const res = await fetch("/api/site-config");
  if (!res.ok) throw new Error("Failed to fetch site config");
  return res.json();
}

export function useSiteConfig() {
  return useQuery<SiteConfig>({
    queryKey: ["site-config"],
    queryFn: fetchSiteConfig,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
