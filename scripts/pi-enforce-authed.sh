#!/bin/bash
# pi-enforce-authed.sh — deja en pi solo providers autenticados (OMP manda).
# Mantiene siempre "omp" (gateway local). Extra a conservar: pasar como args.
# Con backup previo de models.json y settings.json.
set -e
PI_DIR="$HOME/.pi/agent"
TS="$(date +%Y%m%d-%H%M%S)"
cp "$PI_DIR/models.json" "$PI_DIR/models.json.bak.$TS"
cp "$PI_DIR/settings.json" "$PI_DIR/settings.json.bak.$TS"
echo "backups OK ($TS)"
KEEP="$*"
python3 - "$PI_DIR/models.json" "$PI_DIR/settings.json" "$KEEP" <<'EOF'
import json, sys
models_path, settings_path, keep = sys.argv[1], sys.argv[2], sys.argv[3].split()
models = json.load(open(models_path))
keep_set = set(["omp"] + keep)
removed = [k for k in models["providers"] if k not in keep_set]
for k in removed:
    del models["providers"][k]
json.dump(models, open(models_path, "w"), indent=2)
print("providers fuera:", removed or "ninguno")
print("providers dentro:", list(models["providers"].keys()))
s = json.load(open(settings_path))
if s.get("defaultProvider") not in keep_set:
    s["defaultProvider"] = "omp"
    s["defaultModel"] = "mimo-v2.6-flash"
    json.dump(s, open(settings_path, "w"), indent=2)
    print("default migrado a omp/mimo-v2.6-flash")
else:
    print("default intacto:", s.get("defaultProvider"), "/", s.get("defaultModel"))
EOF
python3 -c "import json; json.load(open('$PI_DIR/models.json')); json.load(open('$PI_DIR/settings.json'))" && echo "JSON válido"
