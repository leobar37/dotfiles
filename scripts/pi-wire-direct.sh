#!/bin/bash
# pi-wire-direct.sh — providers DIRECTOS en pi (sin pasar por el gateway OMP :4599).
# Mira xiaomi-token-plan-sgp, zai y deepseek con metadatos exactos desde la caché
# de modelos de OMP (models.db) y keys desde agent.db / pi auth.json.
# El provider "omp" (gateway) se conserva como fallback para muse-code/openai-codex (oauth).
# Con backup previo. Las keys nunca se imprimen ni van a git.
set -e
PI_DIR="$HOME/.pi/agent"
TS="$(date +%Y%m%d-%H%M%S)"
cp "$PI_DIR/models.json" "$PI_DIR/models.json.bak.$TS"
cp "$PI_DIR/settings.json" "$PI_DIR/settings.json.bak.$TS"
echo "backup OK ($TS)"

python3 - "$PI_DIR" <<'EOF'
import json, os, sqlite3, sys

pi_dir = sys.argv[1]
models_path = os.path.join(pi_dir, "models.json")
settings_path = os.path.join(pi_dir, "settings.json")
auth_path = os.path.join(pi_dir, "auth.json")
omp_auth = os.path.expanduser("~/.omp/agent/agent.db")
omp_models = os.path.expanduser("~/.omp/agent/models.db")

# --- keys (sin imprimir) ---
def omp_key(provider):
    con = sqlite3.connect(f"file:{omp_auth}?mode=ro", uri=True)
    row = con.execute("SELECT data FROM auth_credentials WHERE provider=? ORDER BY updated_at DESC", (provider,)).fetchone()
    con.close()
    return json.loads(row[0])["key"] if row else None

pi_auth = json.load(open(auth_path))
def deepseek_key():
    k = (pi_auth.get("deepseek") or {}).get("key")
    return k or omp_key("deepseek")

KEYS = {
    "xiaomi-token-plan-sgp": omp_key("xiaomi-token-plan-sgp"),
    "zai": omp_key("zai"),
    "deepseek": deepseek_key(),
}
missing = [p for p, k in KEYS.items() if not k]
if missing:
    sys.exit(f"ERROR: sin key para {missing}; aborto sin tocar nada")

# --- metadatos exactos desde la caché de OMP ---
con = sqlite3.connect(f"file:{omp_models}?mode=ro", uri=True)
CACHE = {}
for pid in KEYS:
    row = con.execute("SELECT models FROM model_cache WHERE provider_id=?", (pid,)).fetchone()
    if not row:
        sys.exit(f"ERROR: sin caché de modelos para {pid}")
    CACHE[pid] = json.loads(row[0])
con.close()

PROVIDERS = {
    "xiaomi-token-plan-sgp": {
        "baseUrl": "https://token-plan-sgp.xiaomimimo.com/v1",
        "api": "openai-completions",
        # mimo no acepta reasoning_effort (thinkingFormat zai, server-side); sin compat especial
    },
    "zai": {
        "baseUrl": "https://api.z.ai/api/anthropic",
        "api": "anthropic-messages",
        # thinking nativo del protocolo anthropic; pi lo maneja con reasoning:true
    },
    "deepseek": {
        "baseUrl": "https://api.deepseek.com",
        "api": "openai-completions",
        "compat": {"supportsReasoningEffort": True},
    },
}

def to_pi_model(m, provider):
    c = m.get("cost", {})
    e = {
        "id": m["id"],
        "name": m.get("name", m["id"]),
        "reasoning": bool(m.get("reasoning", True)),
        "input": m.get("input", ["text"]),
        "contextWindow": m.get("contextWindow"),
        "maxTokens": m.get("maxTokens"),
        "cost": {
            "input": c.get("input", 0),
            "output": c.get("output", 0),
            "cacheRead": c.get("cacheRead", 0),
            "cacheWrite": c.get("cacheWrite", 0),
        },
    }
    if provider == "deepseek":
        e["compat"] = {"supportsReasoningEffort": True}
    return e

pi = json.load(open(models_path))
for pid, cfg in PROVIDERS.items():
    entry = {
        "baseUrl": cfg["baseUrl"],
        "api": cfg["api"],
        "apiKey": KEYS[pid],
        "models": [to_pi_model(m, pid) for m in CACHE[pid]],
    }
    pi["providers"][pid] = entry
    print(f"{pid} OK: {len(entry['models'])} modelos directos -> {cfg['baseUrl']}")

json.dump(pi, open(models_path, "w"), indent=2)

# --- default: directo, ya no por el gateway ---
s = json.load(open(settings_path))
s["defaultProvider"] = "xiaomi-token-plan-sgp"
s["defaultModel"] = "mimo-v2.6-flash"
json.dump(s, open(settings_path, "w"), indent=2)
print("default -> xiaomi-token-plan-sgp/mimo-v2.6-flash (directo)")
EOF

python3 -c "import json; json.load(open('$PI_DIR/models.json')); json.load(open('$PI_DIR/settings.json'))" && echo "JSON válido"
jq -r '.providers | to_entries[] | "\(.key) -> \(.value.baseUrl // "?") (\(.value.models | length) modelos)"' "$PI_DIR/models.json"
