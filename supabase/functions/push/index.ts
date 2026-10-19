// Entry point for the `push` Edge Function; the logic lives in handler.ts so tests can import it.
import { handler } from './handler.ts';

Deno.serve(handler);
