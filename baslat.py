#!/usr/bin/env python3
"""AI Kripto Bot başlatıcısı (Windows / macOS / Linux).

Yalnızca Python standart kütüphanesini kullanır:
  1. Python sürümünü kontrol eder (3.10+)
  2. .env dosyasını oluşturur
  3. Sanal ortamı kurar; yarıda kalmış/bozuk kurulumu fark edip onarır
  4. Paketleri ilerlemesi görünür şekilde kurar (yalnızca gerektiğinde)
  5. Sunucuyu başlatır, HAZIR OLUNCA tarayıcıyı açar
"""
import hashlib
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
VENV = BACKEND / ".venv"
IS_WIN = os.name == "nt"
VPY = VENV / ("Scripts/python.exe" if IS_WIN else "bin/python")
STAMP = VENV / ".kurulum-tamam"
REQUIREMENTS = BACKEND / "requirements.txt"
UI_INDEX = ROOT / "frontend" / "dist" / "index.html"
LOG_FILE = BACKEND / "data" / "bot.log"


def say(tag, msg):
    print("[{}] {}".format(tag, msg), flush=True)


def fail(msg, *hints):
    print(flush=True)
    say("HATA", msg)
    for h in hints:
        print("       - " + h, flush=True)
    print(flush=True)
    sys.exit(1)


def check_python():
    if sys.version_info < (3, 10):
        fail(
            "Python {}.{} çok eski; en az Python 3.10 gerekli.".format(*sys.version_info[:2]),
            "https://www.python.org/downloads/ adresinden Python 3.12 kurun",
            "Kurulumda 'Add python.exe to PATH' kutusunu işaretleyin",
        )


def read_env():
    values = {}
    path = ROOT / ".env"
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def ensure_env_file():
    env, example = ROOT / ".env", ROOT / ".env.example"
    if not env.exists() and example.exists():
        shutil.copyfile(example, env)
        say("i", ".env dosyası oluşturuldu (varsayılan: paper trading, gerçek para kullanılmaz)")


def venv_works():
    if not VPY.exists():
        return False
    try:
        return subprocess.run([str(VPY), "-c", "import sys"], timeout=60).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def ensure_venv():
    if venv_works():
        return
    if VENV.exists():
        say("i", "Yarım kalmış kurulum bulundu, sanal ortam yeniden oluşturuluyor...")
        shutil.rmtree(VENV, ignore_errors=True)
    else:
        say("i", "Python sanal ortamı oluşturuluyor...")
    result = subprocess.run([sys.executable, "-m", "venv", str(VENV)])
    if result.returncode != 0 or not venv_works():
        fail(
            "Python sanal ortamı oluşturulamadı.",
            "Python'u https://www.python.org/downloads/ adresinden kurun (Microsoft Store sürümü sorun çıkarabilir)",
            "Klasörü kısa ve Türkçe karakter içermeyen bir yola taşıyıp tekrar deneyin (ör. C:\\kripto-bot)",
        )


def fingerprint():
    h = hashlib.sha256(REQUIREMENTS.read_bytes())
    h.update(str(VPY).encode())
    return h.hexdigest()


def ensure_packages():
    fp = fingerprint()
    if STAMP.exists() and STAMP.read_text(encoding="utf-8").strip() == fp:
        say("OK", "Paketler hazır")
        return
    print(flush=True)
    say("i", "Gerekli paketler kuruluyor. İlk seferde 2-5 dakika sürebilir (~150 MB).")
    say("i", "Lütfen bu pencereyi KAPATMAYIN.")
    print(flush=True)
    subprocess.run([str(VPY), "-m", "pip", "install", "--quiet", "--upgrade", "pip"])
    result = subprocess.run([
        str(VPY), "-m", "pip", "install", "--disable-pip-version-check", "--prefer-binary", "-r", str(REQUIREMENTS),
    ])
    if result.returncode != 0:
        fail(
            "Paketler kurulamadı (yukarıdaki kırmızı/uyarı satırlarına bakın).",
            "İnternet bağlantınızı kontrol edin; antivirüs/güvenlik duvarı pip'i engelliyor olabilir",
            "Çok yeni bir Python sürümü kullanıyorsanız Python 3.12 kurup tekrar deneyin",
            "Tekrar denemek için bu dosyayı yeniden çalıştırmanız yeterli",
        )
    check = subprocess.run([str(VPY), "-c", "import fastapi, uvicorn, ccxt, pandas, numpy, sklearn, joblib"])
    if check.returncode != 0:
        fail("Paketler kuruldu ama yüklenemiyor.", "Bu dosyayı yeniden çalıştırın; sorun sürerse backend\\.venv klasörünü silin")
    STAMP.write_text(fp, encoding="utf-8")
    say("OK", "Paketler kuruldu")


def ensure_ui():
    if UI_INDEX.exists():
        return
    npm = shutil.which("npm")
    if not npm:
        say("!", "Arayüz dosyaları eksik (frontend/dist). Depoyu yeniden indirin veya Node.js kurun.")
        return
    say("i", "Arayüz derleniyor...")
    for args in (["install"], ["run", "build"]):
        if subprocess.run([npm, *args], cwd=str(ROOT / "frontend")).returncode != 0:
            say("!", "Arayüz derlenemedi; API yine de çalışacak.")
            return


def port_busy(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex((host, port)) == 0


def healthy(url):
    try:
        with urllib.request.urlopen(url + "/api/health", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def main():
    os.chdir(str(ROOT))
    print("=" * 60)
    print("  AI Kripto Bot")
    print("=" * 60, flush=True)
    check_python()
    ensure_env_file()
    env = read_env()
    # Process environment wins over .env, exactly as in the app's own settings loader.
    host = os.environ.get("HOST") or env.get("HOST") or "127.0.0.1"
    port_text = os.environ.get("PORT") or env.get("PORT") or "8000"
    try:
        port = int(port_text)
    except ValueError:
        fail(".env dosyasındaki PORT değeri geçersiz: {}".format(port_text), "Örnek: PORT=8000")
    browse_host = "127.0.0.1" if host in ("0.0.0.0", "::", "") else host
    url = "http://{}:{}".format(browse_host, port)

    if port_busy(browse_host, port):
        if healthy(url):
            say("OK", "Bot zaten çalışıyor, panel açılıyor: " + url)
            webbrowser.open(url)
            return 0
        fail(
            "{} portu başka bir program tarafından kullanılıyor.".format(port),
            ".env dosyasında PORT=8001 yapıp tekrar deneyin",
        )

    ensure_venv()
    ensure_packages()
    ensure_ui()

    print(flush=True)
    say("i", "Bot başlatılıyor (veri indirme ve ilk yükleme 10-30 saniye sürebilir)...")
    child_env = dict(os.environ, PYTHONUNBUFFERED="1", PYTHONIOENCODING="utf-8")
    proc = subprocess.Popen([str(VPY), "-m", "app.main"], cwd=str(BACKEND), env=child_env)
    try:
        started = time.time()
        warned = False
        while proc.poll() is None:
            if healthy(url):
                print(flush=True)
                print("=" * 60)
                say("OK", "Panel hazır: " + url)
                say("i", "Tarayıcı açılmazsa bu adresi elle açın. Botu durdurmak için bu pencereyi kapatın.")
                print("=" * 60, flush=True)
                webbrowser.open(url)
                break
            if not warned and time.time() - started > 90:
                say("!", "Sunucu hâlâ hazırlanıyor, lütfen bekleyin...")
                warned = True
            time.sleep(1)
        code = proc.wait()
    except KeyboardInterrupt:
        say("i", "Kapatılıyor...")
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        return 0
    if code != 0:
        fail(
            "Bot beklenmedik şekilde kapandı (çıkış kodu {}).".format(code),
            "Yukarıdaki hata satırlarının ekran görüntüsünü paylaşın",
            "Ayrıntılı kayıt: {}".format(LOG_FILE),
        )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
