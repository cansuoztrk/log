import os
import tempfile

# Must run before the app modules are imported: isolated data dir + offline simulated market.
os.environ.setdefault("DATA_DIR", tempfile.mkdtemp(prefix="akb-test-"))
os.environ["DATA_SOURCE"] = "demo"
os.environ.pop("DASHBOARD_TOKEN", None)
