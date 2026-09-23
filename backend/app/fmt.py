"""Turkish number formatting for human-readable messages (1.234,56 · %12,3 · +%1,50)."""
from __future__ import annotations


def num(x: float, d: int = 2) -> str:
    s = f"{abs(x):,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return ("−" if x < 0 and float(f"{abs(x):.{d}f}") != 0 else "") + s


def signed(x: float, d: int = 2) -> str:
    return ("+" if x > 0 else "") + num(x, d)


def pct(x: float, d: int = 1, sign: bool = False) -> str:
    """`x` is already in percent units."""
    body = f"%{num(abs(x), d)}"
    if x < 0:
        return "−" + body
    return ("+" if sign and x > 0 else "") + body
