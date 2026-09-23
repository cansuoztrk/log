#!/usr/bin/env bash
# AI Kripto Bot — macOS / Linux başlatıcı
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[i] .env dosyası oluşturuldu (varsayılan: paper trading)."
fi

PY=python3
command -v $PY >/dev/null 2>&1 || PY=python
if [ ! -d backend/.venv ]; then
  echo "[i] Python sanal ortamı kuruluyor..."
  $PY -m venv backend/.venv
fi
# shellcheck disable=SC1091
. backend/.venv/bin/activate
pip install -q --upgrade pip >/dev/null
pip install -q -r backend/requirements.txt

if [ ! -f frontend/dist/index.html ] || [ "${BUILD_UI:-0}" = "1" ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "[i] Arayüz derleniyor..."
    (cd frontend && npm install --silent && npm run build --silent)
  else
    echo "[!] Node.js bulunamadı; arayüz derlenemedi. https://nodejs.org adresinden kurun."
  fi
fi

PORT=$(grep -E '^PORT=' .env | cut -d= -f2); PORT=${PORT:-8000}
( sleep 3; (command -v xdg-open >/dev/null && xdg-open "http://127.0.0.1:$PORT") || (command -v open >/dev/null && open "http://127.0.0.1:$PORT") ) >/dev/null 2>&1 &
echo "[✓] Bot başlatılıyor: http://127.0.0.1:$PORT  (durdurmak için Ctrl+C)"
cd backend && exec python -m app.main
