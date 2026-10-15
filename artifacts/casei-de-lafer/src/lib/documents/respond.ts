const NOT_FOUND = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Documento indisponível</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f0e0c;color:#efe9df;font-family:Georgia,serif;text-align:center;padding:24px}p{font-family:system-ui,sans-serif;color:#b6ac97;font-size:15px}</style></head>
<body><div><h1>Documento indisponível</h1><p>Este link não existe ou ainda não tem orçamento. Fale com a Eu Casei de Lafer pelo WhatsApp.</p></div></body></html>`;

export function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

export const notFound = () => html(NOT_FOUND, 404);
