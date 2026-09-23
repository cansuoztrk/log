@echo off
rem AI Kripto Bot - Windows baslatici
chcp 65001 >nul
cd /d "%~dp0"

if not exist .env (
  copy .env.example .env >nul
  echo [i] .env dosyasi olusturuldu ^(varsayilan: paper trading^).
)

where python >nul 2>nul || (echo [!] Python bulunamadi. https://www.python.org adresinden kurun ^("Add to PATH" secili olsun^). & pause & exit /b 1)

if not exist backend\.venv (
  echo [i] Python sanal ortami kuruluyor...
  python -m venv backend\.venv
)
call backend\.venv\Scripts\activate.bat
python -m pip install -q --upgrade pip >nul
pip install -q -r backend\requirements.txt

if not exist frontend\dist\index.html (
  where npm >nul 2>nul && (
    echo [i] Arayuz derleniyor...
    pushd frontend & call npm install --silent & call npm run build --silent & popd
  ) || echo [!] Node.js bulunamadi; arayuz derlenemedi. https://nodejs.org
)

start "" http://127.0.0.1:8000
echo [OK] Bot baslatiliyor: http://127.0.0.1:8000  ^(durdurmak icin bu pencereyi kapatin^)
cd backend
python -m app.main
pause
