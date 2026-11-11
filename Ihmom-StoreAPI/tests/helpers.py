from uuid import uuid4


def idempotency_headers(key: str | None = None) -> dict[str, str]:
    return {"Idempotency-Key": key or str(uuid4())}


def post_checkout(client, payload: dict, key: str | None = None):
    return client.post(
        "/orders/checkout",
        json=payload,
        headers=idempotency_headers(key),
    )
