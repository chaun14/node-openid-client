import { rejects } from './run.js'

rejects(
  import.meta.url,
  { code: 'OAUTH_INVALID_RESPONSE' },
  {
    message: /"aud"/,
  },
)
