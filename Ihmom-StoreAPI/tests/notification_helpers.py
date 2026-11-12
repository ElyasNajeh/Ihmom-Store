"""Only fictitious recipients/credentials and local webhook signatures."""

import base64
import hashlib
import hmac

from app.features.notifications.config import BirdConfig


TEST_OWNER = "+15555550123"
TEST_CONFIG = BirdConfig("mock-only-not-a-real-bird-key", TEST_OWNER)


def signed_headers(body, *, secret=None, timestamp=1_800_000_000, event_id="evt_unit"):
    raw_key = b"unit-webhook-secret-material-only"
    secret = secret or "whsec_" + base64.b64encode(raw_key).decode()
    key = base64.b64decode(secret[6:])
    signed = f"{event_id}.{timestamp}.".encode() + body
    signature = base64.b64encode(
        hmac.new(key, signed, hashlib.sha256).digest()
    ).decode()
    return {
        "webhook-id": event_id,
        "webhook-timestamp": str(timestamp),
        "webhook-signature": "v1," + signature,
    }, secret
