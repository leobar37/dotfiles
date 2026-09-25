#!/bin/bash
# pi-wire-gateway.sh — expone OMP (gateway :4599) como provider "omp" en pi.
# Espeja los modelos que opencode ya usa contra el mismo gateway (mismo catálogo,
# mismos costos). Con backup previo. La key del gateway es local, nunca va a git.
set -e
PI="$HOME/.pi/agent/models.json"
OC="$HOME/.config/opencode/opencode.json"
cp "$PI" "$PI.bak.$(date +%Y%m%d-%H%M%S)" && echo "backup OK"
python3 - "$PI" "$OC" <<'EOF'
import json, sys, copy, sqlite3
pi_path, oc_path = sys.argv[1], sys.argv[2]
HOME = "/home/leobar37"
pi = json.load(open(pi_path))
oc = json.load(open(oc_path))
gateway_key = oc["providers"]["muse-code"]["settings"]["apiKey"]
oc_models = oc["providers"]["muse-code"]["models"]
template = copy.deepcopy(pi["providers"]["opencode-go"]["models"][0])
models = []
for mid, m in oc_models.items():
    e = copy.deepcopy(template)
    e["id"] = mid
    e["name"] = f"{m['name']} (OMP)"
    e["reasoning"] = m.get("reasoning", True)
    e["contextWindow"] = m.get("limit", {}).get("context", e["contextWindow"])
    e["maxTokens"] = m.get("limit", {}).get("output", e["maxTokens"])
    c = m.get("cost", {})
    e["cost"] = {
        "input": c.get("input", 0),
        "output": c.get("output", 0),
        "cacheRead": c.get("cache_read", 0),
        "cacheWrite": c.get("cache_write", 0),
    }
    models.append(e)
# mimo directo desde la caché OMP (números exactos, sin inventar)
con = sqlite3.connect(f"file:{HOME}/.omp/agent/models.db?mode=ro", uri=True)
row = con.execute("SELECT models FROM model_cache WHERE provider_id='xiaomi-token-plan-sgp'").fetchone()
if row:
    for m in json.loads(row[0]):
        e = copy.deepcopy(template)
        e["id"] = m["id"]
        e["name"] = f"{m.get('name', m['id'])} (OMP)"
        e["reasoning"] = m.get("reasoning", True)
        if isinstance(m.get("input"), list):
            e["input"] = m["input"]
        e["contextWindow"] = m.get("contextWindow", e["contextWindow"])
        e["maxTokens"] = m.get("maxTokens", e["maxTokens"])
        c = m.get("cost", {})
        e["cost"] = {
            "input": c.get("input", 0),
            "output": c.get("output", 0),
            "cacheRead": c.get("cacheRead", 0),
            "cacheWrite": c.get("cacheWrite", 0),
        }
        models.append(e)
    print(f"mimo OK: {len(json.loads(row[0]))} modelos desde caché OMP")
pi["providers"]["omp"] = {
    "baseUrl": "http://127.0.0.1:4599/v1",
    "api": "openai-completions",
    "apiKey": gateway_key,
    "models": models,
}
json.dump(pi, open(pi_path, "w"), indent=2)
print(f"provider omp OK: {len(models)} modelos espejados")
EOF
python3 -c "import json; json.load(open('$PI'))" && echo "JSON válido"
