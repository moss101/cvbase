import { handleOptions } from '../_shared/cors.ts';
import { fail } from '../_shared/respond.ts';
import { getUser, serviceClient } from '../_shared/auth.ts';
import { assembleExport, exportResponse } from './export.ts';

// account-export entry point: auth, then the document assembly in export.ts
// (kept separate so the section coverage is testable with a fake service
// client — see export_test.ts).
Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req);
    const body = await assembleExport(serviceClient(), user);
    return exportResponse(body);
  } catch (err) {
    return fail(err);
  }
});
