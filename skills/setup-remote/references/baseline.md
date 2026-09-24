# Remote development baseline

Esta referencia define lo que significa que un servidor de desarrollo se sienta
igual a la workstation. Los números de versión son observables, no secretos ni
valores para forzar ciegamente.

## Required / preferred / optional

| Área | Estado | Preferencia |
|---|---|---|
| Linux Debian/Ubuntu | Required | Usuario de desarrollo no-root y sudo controlado |
| Bash | Required | Fallback para comandos no interactivos |
| Zsh | Preferred | Shell interactivo predeterminado |
| Oh My Zsh | Preferred | Tema y plugins iguales a la workstation |
| screenfetch | Preferred | Identificación visual rápida del servidor y sus herramientas |
| Tailscale | Optional | Instalado si hace falta red tailnet; login separado |
| Bun | Required | Compatible con `packageManager`/`engines` del repo |
| OMP | Required | Misma versión efectiva y preferencias seguras |
| Herdr | Required para workspaces | Protocolo compatible con la CLI e integración OMP activa |
| GitHub CLI | Preferred | Autenticación verificada sin exponer token |
| Docker/Compose | Optional | Solo con autorización explícita; no arrancar por defecto |


1. Captura para cada herramienta `command -v`, versión y origen de instalación.
2. Usa el checkout como autoridad para Bun: inspecciona `package.json` y el
   lockfile antes de decidir si existe drift.
3. OMP debe tener la misma versión que la workstation cuando sea posible.
4. Herdr debe hablar un protocolo aceptado por la CLI local. La versión exacta
   se prefiere, pero una versión de parche compatible es aceptable si doctor y
   el workspace pasan.
5. No cambies el lockfile remoto para resolver un mismatch de Bun. Si la
   instalación necesita una excepción temporal, regístrala como drift.
6. Para Git, GitHub CLI, Tailscale y paquetes del sistema, reporta la versión
   instalada y actualiza solo si el usuario lo aprobó.
7. Tras actualizar una herramienta, repite únicamente su check y los checks que
   cubren su integración; no ejecutes una suite completa por defecto.

## Shell profile

El perfil deseado se basa en la workstation actual:

```text
shell: /usr/bin/zsh
framework: Oh My Zsh
theme: robbyrussell
plugins: git sudo command-not-found history
```

El `.zshenv`, `.zshrc`, `.bashrc` y `.profile` remoto deben ser portables:

- usar `$HOME`, nunca `/home/<persona-local>` o `/Users/<persona>`;
- envolver fuentes opcionales con `if [ -r ... ]`;
- cargar el broker desde `~/.config/omp/broker.env` solo si el archivo existe;
- no contener API keys, tokens, contraseñas, cookies ni private keys;
- mantener Bash funcional para `target exec` y automatizaciones.

## OMP and broker

La configuración se divide en dos capas:

1. `~/.omp/agent/config.yml`: preferencias no sensibles, perfiles, modelos,
   roles, retry/fallback, temas y extensiones aprobadas.
2. `~/.config/omp/broker.env`: URL y token del broker, permisos `0600`, cargados
   por el shell o por el supervisor que inicia Herdr.
Cuando el broker se comparte con un servidor remoto, todos los clientes deben
usar la IP Tailscale o el nombre MagicDNS del host que lo ejecuta, por ejemplo:

```text
http://100.x.y.z:9000
```

`127.0.0.1` solo es válido cuando el cliente y el broker viven en la misma
máquina. El bind del servicio debe limitarse a la interfaz Tailscale, no a
`0.0.0.0`, salvo que exista una decisión de red explícita.

No compares hashes de archivos que incluyan secretos ni muestres su contenido.
Para comprobar igualdad funcional, verifica nombres de preferencias no sensibles
 y presencia booleana del broker:

```bash
set -a
. "$HOME/.config/omp/broker.env"
set +a
test -n "$OMP_AUTH_BROKER_URL"
test -n "$OMP_AUTH_BROKER_TOKEN"
```

Después de cambiar el broker, reinicia controladamente el servidor Herdr para
que las nuevas sesiones reciban el entorno actualizado. No reinicies productos
ni bases de datos como parte de esta operación.

## SSH policy

Se pueden sincronizar aliases y directivas no secretas como `Host`, `HostName`,
`User`, `Port`, `ProxyJump`, `IdentitiesOnly`, `AddKeysToAgent` y políticas de
keepalive, siempre revisándolas antes.

No transferir automáticamente:

- `IdentityFile`, `IdentityAgent`, `CertificateFile` o claves privadas;
- `known_hosts` de otra máquina;
- `ProxyCommand`, forwards, sockets de control o includes desconocidos;
- credenciales incrustadas en URLs.

La alternativa preferida es que cada host conserve sus claves localmente o use
un agente SSH previamente configurado. La configuración remota debe quedar en
`~/.ssh/config` con permisos `0600` y el directorio en `0700`.

## Herdr and workspace

La definición de “listo” requiere las dos capas:

```bash
bun run elena target doctor <target-id> --json
bun run elena workspace status <target-id>:<workspace> --json
```

`target doctor` debe confirmar transporte, binario Herdr, servidor, protocolo e
integración OMP. `workspace status` debe terminar en `ready`, con worktree y pane
existentes. Los IDs internos de Herdr no deben convertirse en configuración
manual; la CLI los resuelve.

## Resultado esperado

El informe final debe responder:

- ¿Qué herramientas faltan?
- ¿Qué versiones tienen y cuáles se esperan?
- ¿Qué diferencias son inocuas y cuáles bloquean el trabajo?
- ¿Qué cambios se aplicaron y cuáles requieren autorización o login manual?
- ¿El target doctor está listo?
- ¿El workspace está `ready`?
- ¿Se preservaron secretos, claves y cambios del repositorio?
