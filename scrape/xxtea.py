from __future__ import annotations


DELTA = 0x9E3779B9


def _to_uint32_list(data: bytes, include_length: bool) -> list[int]:
    length = len(data)
    padded = data + b"\0" * ((4 - length & 3) & 3)
    values = [
        int.from_bytes(padded[i : i + 4], "little")
        for i in range(0, len(padded), 4)
    ]
    if include_length:
        values.append(length)
    return values


def _from_uint32_list(values: list[int], include_length: bool) -> bytes:
    data = b"".join((value & 0xFFFFFFFF).to_bytes(4, "little") for value in values)
    if include_length:
        length = values[-1]
        if length < 0 or length > len(data):
            raise ValueError("invalid XXTEA length")
        data = data[:length]
    return data


def _normalize_key(key: bytes) -> list[int]:
    return _to_uint32_list(key.ljust(16, b"\0")[:16], False)


def encrypt(data: bytes, key: bytes) -> bytes:
    if not data:
        return b""

    values = _to_uint32_list(data, True)
    keys = _normalize_key(key)
    n = len(values) - 1
    rounds = 6 + 52 // (n + 1)
    total = 0
    z = values[n]

    for _ in range(rounds):
        total = (total + DELTA) & 0xFFFFFFFF
        e = (total >> 2) & 3
        for p in range(n):
            y = values[p + 1]
            mx = (
                (((z >> 5) ^ (y << 2)) + ((y >> 3) ^ (z << 4)))
                ^ ((total ^ y) + (keys[(p & 3) ^ e] ^ z))
            )
            values[p] = (values[p] + mx) & 0xFFFFFFFF
            z = values[p]
        y = values[0]
        mx = (
            (((z >> 5) ^ (y << 2)) + ((y >> 3) ^ (z << 4)))
            ^ ((total ^ y) + (keys[(n & 3) ^ e] ^ z))
        )
        values[n] = (values[n] + mx) & 0xFFFFFFFF
        z = values[n]

    return _from_uint32_list(values, False)


def decrypt(data: bytes, key: bytes) -> bytes:
    if not data:
        return b""

    values = _to_uint32_list(data, False)
    keys = _normalize_key(key)
    n = len(values) - 1
    rounds = 6 + 52 // (n + 1)
    total = (rounds * DELTA) & 0xFFFFFFFF
    y = values[0]

    while total:
        e = (total >> 2) & 3
        for p in range(n, 0, -1):
            z = values[p - 1]
            mx = (
                (((z >> 5) ^ (y << 2)) + ((y >> 3) ^ (z << 4)))
                ^ ((total ^ y) + (keys[(p & 3) ^ e] ^ z))
            )
            values[p] = (values[p] - mx) & 0xFFFFFFFF
            y = values[p]
        z = values[n]
        mx = (
            (((z >> 5) ^ (y << 2)) + ((y >> 3) ^ (z << 4)))
            ^ ((total ^ y) + (keys[e] ^ z))
        )
        values[0] = (values[0] - mx) & 0xFFFFFFFF
        y = values[0]
        total = (total - DELTA) & 0xFFFFFFFF

    return _from_uint32_list(values, True)

