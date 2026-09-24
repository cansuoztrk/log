#!/usr/bin/env bash
# AI Kripto Bot - macOS / Linux baslatici. Asil isi baslat.py yapar.
cd "$(dirname "$0")" || exit 1
for py in python3 python; do
  if command -v "$py" >/dev/null 2>&1 && "$py" -c 'import sys; sys.exit(0 if sys.version_info[:2] >= (3, 10) else 1)' 2>/dev/null; then
    exec "$py" baslat.py
  fi
done
echo "[HATA] Python 3.10 veya daha yeni bir surum bulunamadi: https://www.python.org/downloads/"
exit 1
