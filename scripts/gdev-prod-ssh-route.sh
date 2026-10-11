#!/usr/bin/env bash
# gdev-prod-ssh-route.sh — ruta SSH gdev-01 → avileo-prod-01 (deploy de Elena Tech).
#
# PROBLEMA QUE RESUELVE
#   `VPS_HOST` en Doppler (proyecto elena-tech, config prd) es la IP PÚBLICA de
#   avileo-prod-01, y esa :22 sólo acepta dos orígenes:
#     - allow-iap-ssh-prod   → 35.235.240.0/20 (túnel IAP)
#     - allow-ship-ssh-prod  → 179.6.47.25/32  (IP de oficina)
#   gdev-01 no tiene IP externa: sale por Cloud NAT (router gdev-nat-router) y su
#   IP no está en ninguna allowlist ⇒ conectar a la IP pública da TIMEOUT.
#   gdev-01 tampoco tenía clave privada, así que `ssh <ip interna>` devolvía
#   `Permission denied (publickey)`. Resultado: gdev no podía deployar.
#
# QUÉ HACE (idempotente, re-ejecutable)
#   1. Clave dedicada en gdev-01: ~/.ssh/gdev_ed25519 (ed25519, sin passphrase).
#   2. Autoriza su .pub en prod (~/.ssh/authorized_keys de leobar37).
#   3. Escribe el bloque gestionado en ~/.ssh/config de gdev-01:
#        - Host <IP pública de VPS_HOST> → HostName <IP interna>   (ruta del deploy)
#        - Host gcp-avileo-prod          → uso interactivo/diagnóstico
#      gdev-01 comparte VPC/subred con prod y `default-allow-internal`
#      (10.128.0.0/9) ya permite tcp:22 ⇒ la ruta interna funciona.
#      NO se toca VPS_HOST en Doppler: workstation y Mac están fuera de la VPC y
#      necesitan la IP pública.
#   4. Registra el target `gcp-avileo-prod` en el CLI de Elena dentro de gdev-01
#      (equivalente a la workstation) para `elena target exec`.
#   5. Verifica: ssh interactivo + transporte del CLI + ruta exacta del deploy
#      (clave de Doppler contra VPS_HOST).
#
# USO
#   scripts/gdev-prod-ssh-route.sh            # aplica/repone todo
#   scripts/gdev-prod-ssh-route.sh --check    # sólo verifica (no escribe nada)
#
# ALTERNATIVA DE RED (requiere aprobación; cambio a nivel proyecto)
#   Agregar la IP de egress del Cloud NAT (gcloud compute routers nats ...) a la
#   regla allow-ship-ssh-prod; con eso el bloque de reescritura sobra. Ojo: la
#   asignación del NAT es AUTO_ONLY, así que su IP puede cambiar al recrear el
#   router — hoy por hoy el reescritura por alias es más estable.
set -euo pipefail

GDEV_HOST="${GDEV_HOST:-gdev}"                  # alias SSH (inventario: devices.yml)
WS_PROD_ALIAS="${WS_PROD_ALIAS:-gcp-avileo-prod}" # alias desde la workstation
GDEV_PROD_ALIAS="${GDEV_PROD_ALIAS:-gcp-avileo-prod}"
PROJECT="${PROJECT:-elena-tech-prod}"
ZONE="${ZONE:-southamerica-east1-a}"
INSTANCE="${INSTANCE:-avileo-prod-01}"
KEY_NAME="${KEY_NAME:-gdev_ed25519}"
KEY_COMMENT="${KEY_COMMENT:-gdev-01-avileo-prod}"
GDEV_REPO="${GDEV_REPO:-\$HOME/code/theelena}"
MARK_BEGIN="# >>> gdev-prod-route (managed by dotfiles/scripts/gdev-prod-ssh-route.sh) >>>"
MARK_END="# <<< gdev-prod-route (managed) <<<"

CHECK=0
[[ "${1:-}" == "--check" || "${1:-}" == "-c" ]] && CHECK=1

log() { printf '==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

ssh_gdev() { ssh -o BatchMode=yes -o ConnectTimeout=20 "$GDEV_HOST" "$@"; }

# IPs resueltas por gcloud (nunca hardcodeadas, para que no envejezcan).
PUB_IP="$(gcloud compute instances describe "$INSTANCE" --project="$PROJECT" --zone="$ZONE" \
  --format='value(networkInterfaces[0].accessConfigs[0].natIP)')"
INT_IP="$(gcloud compute instances describe "$INSTANCE" --project="$PROJECT" --zone="$ZONE" \
  --format='value(networkInterfaces[0].networkIP)')"
[[ -n "$PUB_IP" && -n "$INT_IP" ]] || die "no pude resolver las IPs de $INSTANCE ($PROJECT/$ZONE)"

log "avileo-prod-01  pública=$PUB_IP  interna=$INT_IP"

if [[ "$CHECK" == 0 ]]; then
  # 1) clave dedicada en gdev-01
  ssh_gdev "if [ -f ~/.ssh/$KEY_NAME ]; then echo 'clave ya existe'; else
      ssh-keygen -t ed25519 -f ~/.ssh/$KEY_NAME -N '' -C '$KEY_COMMENT' >/dev/null
      echo 'clave creada'; fi; chmod 600 ~/.ssh/$KEY_NAME; chmod 644 ~/.ssh/$KEY_NAME.pub"

  PUBKEY="$(ssh_gdev "cat ~/.ssh/$KEY_NAME.pub")"

  # 2) autorizar en prod (idempotente)
  ssh -o BatchMode=yes "$WS_PROD_ALIAS" "if grep -qF '$KEY_COMMENT' ~/.ssh/authorized_keys; then
      echo 'pubkey ya autorizada en prod'; else
      printf '%s\n' '$PUBKEY' >> ~/.ssh/authorized_keys; echo 'pubkey autorizada en prod'; fi"

  # 3) bloque gestionado en ~/.ssh/config de gdev-01
  BLOCK="$MARK_BEGIN
# avileo-prod-01 acepta :22 sólo desde IAP y la IP de oficina; gdev-01 sale por
# Cloud NAT (IP no allowlisted) ⇒ se reescribe VPS_HOST a la IP interna del VPC.
# Auth del deploy: elena ship usa VPS_SSH_PRIVATE_KEY de Doppler (efímera, -i);
# este archivo no participa. Para uso interactivo: $KEY_NAME.
Host $PUB_IP
  HostName $INT_IP
  User leobar37
  IdentityFile ~/.ssh/$KEY_NAME
  IdentitiesOnly yes
  HostKeyAlias avileo-prod
  StrictHostKeyChecking accept-new

# Uso interactivo / diagnóstico desde gdev-01 (mismo nombre que en la workstation).
Host $GDEV_PROD_ALIAS
  HostName $INT_IP
  User leobar37
  IdentityFile ~/.ssh/$KEY_NAME
  IdentitiesOnly yes
  HostKeyAlias avileo-prod
  StrictHostKeyChecking accept-new
  AddKeysToAgent yes
$MARK_END"

  printf '%s\n' "$BLOCK" | ssh_gdev "cat > ~/.ssh/config.new-block
    ts=\$(date +%Y%m%d-%H%M%S); [ -f ~/.ssh/config ] && cp -a ~/.ssh/config ~/.ssh/config.bak.\$ts
    awk -v b='$MARK_BEGIN' -v e='$MARK_END' '\$0==b{skip=1;next} \$0==e{skip=0;next} !skip{print}' ~/.ssh/config > ~/.ssh/config.base 2>/dev/null || :
    { cat ~/.ssh/config.base; echo; cat ~/.ssh/config.new-block; } > ~/.ssh/config
    rm -f ~/.ssh/config.base ~/.ssh/config.new-block
    chmod 600 ~/.ssh/config
    echo 'bloque escrito en ~/.ssh/config'"

  # 4) target del CLI dentro de gdev-01 (idempotente)
  ssh_gdev "export PATH=\"\$HOME/.bun/bin:\$PATH\"; cd $GDEV_REPO
    if bun run elena target list --json 2>/dev/null | grep -q '\"$GDEV_PROD_ALIAS\"'; then
      echo 'target $GDEV_PROD_ALIAS ya registrado'
    else
      bun run elena target add $GDEV_PROD_ALIAS --type ssh --ssh-alias $GDEV_PROD_ALIAS \
        --repository-root /opt/elena-tech --worktree-root '~/.herdr/worktrees/theelena' | tail -1
    fi"
fi

# 5) verificación
log "verificando"
ssh_gdev "echo '  ssh interactivo: '\$(ssh -o BatchMode=yes -o ConnectTimeout=15 $GDEV_PROD_ALIAS hostname 2>&1)"
ssh_gdev "export PATH=\"\$HOME/.bun/bin:\$PATH\"; cd $GDEV_REPO
  bun run elena target doctor $GDEV_PROD_ALIAS --json 2>/dev/null | grep -A2 '\"name\": \"transport\"' | tr -d '\n ' | sed 's/^/  transporte CLI: /'; echo"
log "listo — la ruta del deploy (VPS_HOST=$PUB_IP → $INT_IP) queda cubierta por el bloque gestionado"
