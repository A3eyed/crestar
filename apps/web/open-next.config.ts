import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Default config: no R2 incremental cache required to deploy.
// Add r2IncrementalCache later when NEXT_INC_CACHE_R2_BUCKET is bound.
export default defineCloudflareConfig({});
