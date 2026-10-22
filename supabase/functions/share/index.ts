// Entry point for the `share` Edge Function; the logic lives in handler.ts and card.ts.
import { handler } from './handler.ts';

Deno.serve(handler);
