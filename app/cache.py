import threading
import time
from functools import wraps

_cache: dict[str, tuple[float, object]] = {}
_lock = threading.Lock()


def ttl_cache(ttl_seconds: float = 5.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = func.__name__
            now = time.monotonic()
            with _lock:
                hit = _cache.get(key)
                if hit is not None and now - hit[0] < ttl_seconds:
                    return hit[1]
            result = func(*args, **kwargs)
            with _lock:
                _cache[key] = (now, result)
            return result
        return wrapper
    return decorator
