// Ambient declarations for the Deno Edge Functions.
//
// These functions run on Deno (URL imports + the `Deno` global). Deno and the
// Supabase CLI provide the real types at runtime; this file just gives the
// editor enough to type-check the folder without false errors. It must live in
// its own file (not next to a `index.ts` with the same name, or TypeScript
// treats it as that file's declaration output and ignores it).
//
// Used by ./tsconfig.json (editor-only); not part of the app's tsconfig.

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm" {
  export function createClient(url: string, key: string, options?: any): any;
}

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };
}
