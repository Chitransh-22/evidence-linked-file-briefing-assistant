import os
import sys
import socket
import pytest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# On Windows, wrap socketpair with retry to handle transient WinError 10013 ephemeral port collision
if sys.platform == "win32":
    orig_socketpair = socket.socketpair

    def safe_socketpair(*args, **kwargs):
        for attempt in range(10):
            try:
                return orig_socketpair(*args, **kwargs)
            except (PermissionError, OSError):
                if attempt == 9:
                    raise
                import time
                time.sleep(0.05)

    socket.socketpair = safe_socketpair



