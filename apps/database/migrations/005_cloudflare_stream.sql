-- 005_cloudflare_stream.sql
-- Extra columns for Cloudflare Stream live inputs
BEGIN;

ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS stream_input_uid text;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS webrtc_publish_url text;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS webrtc_playback_url text;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS rtmps_url text;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS rtmps_stream_key text;

CREATE INDEX IF NOT EXISTS idx_live_stream_uid ON live_sessions(stream_input_uid);

COMMIT;
