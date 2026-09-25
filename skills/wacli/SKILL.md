---
name: wacli
description: Usa wacli para acceder a WhatsApp personal desde la terminal del workstation — buscar mensajes, listar chats/contactos/grupos, enviar texto o archivos, y sincronizar historial a SQLite local. Usar cuando el usuario pida leer, buscar o enviar WhatsApp, revisar chats, o mencionar wacli/whatsapp cli. El binario global es un build del fork ~/code/wacli.
---

# wacli — WhatsApp desde la terminal

Cliente scriptable de WhatsApp sobre `whatsmeow` (protocolo WhatsApp Web, dispositivo
vinculado). Fork propio compilado localmente: no reinstalar desde release.

## Instalación en este workstation (2026-09-24)

| Componente | Ruta |
|---|---|
| Binario global | `~/.local/bin/wacli` (build del fork, NO del release) |
| Fuente (fork) | `~/code/wacli` — `origin`=`leobar37/wacli`, `upstream`=`openclaw/wacli` |
| Store (sesión + índice SQLite) | `~/.local/state/wacli` |
| Go toolchain | `~/.local/go` (PATH en `~/.bashrc`) |

Cuenta vinculada: `51967966237@s.whatsapp.net`. Verificar siempre con `wacli auth status`.

## Comandos esenciales

```bash
wacli auth status                      # ¿sesión activa? (no muestra QR)
wacli auth                             # emparejar (QR en terminal) — solo interactivo
wacli sync --follow                    # mantener índice al día (recibir mensajes)
wacli messages search "texto"          # búsqueda full-text offline sobre el índice local
wacli messages search "texto" --has-media --json
wacli messages list --chat <nombre> --limit 20
wacli send text --to "+519XXXXXXXX" --message "hola"
wacli send text --to <nombre-contacto> --message "hola"   # acepta nombre de chat/contacto
wacli send file --to <dest> --file foto.jpg --caption "nota"
wacli chats list | contacts list | groups list
wacli media download                   # descargar media sincronizada
wacli doctor                           # diagnóstico store/auth/search
```

Destinatarios válidos: número internacional, JID (`...@s.whatsapp.net`, `...@g.us`) o
nombre de contacto/grupo sincronizado.

## Para agentes / scripting

- `--json` en comandos one-shot; `--events` para NDJSON en comandos largos.
- `--read-only` (o `WACLI_READONLY=1`) rechaza escrituras — usar para consultas seguras:
  ```bash
  wacli --read-only --json messages search "factura"
  ```
- La búsqueda lee el índice local: funciona sin conexión activa. Para recibir en
  tiempo real debe haber un `wacli sync --follow` corriendo.
- Progreso/errores van a stderr; tablas humanas son el default sin `--json`.

## Reconstruir tras cambios (fork propio)

```bash
cd ~/code/wacli
git pull upstream main                 # opcional: traer novedades
CGO_ENABLED=1 CGO_CFLAGS="-Wno-error=missing-braces" \
  go build -tags sqlite_fts5 -o dist/wacli ./cmd/wacli
install dist/wacli ~/.local/bin/wacli
```

Requisitos del build: Go 1.27+ y gcc (CGO obligatorio por SQLite; el tag
`sqlite_fts5` habilita la búsqueda full-text). NO usar `make build` (requiere pnpm).

## Seguridad

- Protocolo no oficial: riesgo de ban bajo pero real. NUNCA spam, bulk messaging
  ni automatización masiva desde la cuenta personal.
- La sesión es un linked device: revocar desde el celular (Dispositivos conectados)
  o `wacli auth logout`.
- Para producción/negocio usar Evolution API (`@tarileo/whatsapp`), no esta cuenta.
