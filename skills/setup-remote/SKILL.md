---
name: setup-remote
description: |
  Audita y prepara servidores Linux de desarrollo para que se sientan como la
  workstation local: shell, Oh My Zsh, Git/SSH, Bun, OMP, Herdr, GitHub CLI,
  Tailscale, screenfetch y herramientas opcionales. Úsala cuando el usuario diga
  setup remote, configurar servidor remoto, preparar Ubuntu/Debian, igualar entorno,
  revisar tools y versiones, o comparar un servidor de desarrollo.
---

# Setup Remote

Alinea un servidor de desarrollo con el baseline de Elena Tech sin convertir la
configuración en una copia insegura de la workstation local. La skill tiene dos
modos explícitos:

- **Audit**: solo inspecciona y devuelve una matriz de herramientas, versiones,
  paths, shell, OMP, Herdr, SSH y estado de Tailscale.
- **Setup**: aplica únicamente los cambios aprobados después del inventario.

Para targets de Elena Tech, `elena` es la superficie de lifecycle. Usa
[`elena-remote-control`](../elena-remote-control/SKILL.md) para registrar
servidores, diagnosticar Herdr, crear workspaces y ejecutar comandos remotos.
No inventes aliases, paths ni IDs.

## Baseline preferido

El servidor debe terminar, cuando el usuario lo autorice, con:

- Debian/Ubuntu Linux, usuario de desarrollo no-root y `sudo` disponible.
- Bash como fallback y Zsh como shell interactivo predeterminado.
- Oh My Zsh con el mismo tema y plugins de la workstation, sin rutas absolutas
  específicas del equipo local.
- `.zshenv` debe cargar variables comunes de procesos Zsh, especialmente el
  broker, de forma portable y sin secretos embebidos.
- Git, curl, ca-certificates, unzip, Bun, OMP, Herdr, GitHub CLI y screenfetch.
- Bun compatible con la versión declarada por el repositorio; no cambiar el
  lockfile para ocultar un drift de versión.
- OMP con las preferencias no sensibles sincronizadas y el mismo broker
  efectivo. Los tokens viven en un archivo de secretos `0600` o en un gestor
  de secretos, nunca en dotfiles versionados ni en argumentos de procesos.
- Si el broker se comparte entre hosts, la URL debe usar la IP o el nombre
  MagicDNS de Tailscale; nunca `127.0.0.1` en la configuración remota.
- Herdr con protocolo compatible con la CLI local, servidor activo e integración
  OMP-Herdr instalada.
- Tailscale instalado si se requiere acceso entre dispositivos, pero su login y
  la identidad del nodo se configuran por separado.
- Docker/Compose solo como capacidad opcional y únicamente con autorización
  explícita; esta skill no inicia contenedores ni bases de datos por defecto.

La matriz, políticas de versiones y comandos están en
[`references/baseline.md`](references/baseline.md).

## Flujo obligatorio

### 1. Explicar antes de actuar

Indica qué vas a inspeccionar y qué cambios podrían tener efectos secundarios.
Distingue siempre audit de setup. Si el usuario no autorizó mutaciones, detente
después del informe.

### 2. Inventario read-only

Primero determina el target real:

```bash
bun run elena target list --json
bun run elena target doctor <target-id> --json
```

Después recoge en local y remoto, sin imprimir valores sensibles:

```bash
bun run elena target exec <target-id> -- bash -lc '
  set -u
  printf "os="; . /etc/os-release 2>/dev/null && printf "%s %s\\n" "$ID" "$VERSION_ID"
  printf "arch="; uname -m
  printf "shell="; getent passwd "$(id -un)" | cut -d: -f7
  for tool in git bun omp herdr gh tailscale docker zsh screenfetch; do
    if command -v "$tool" >/dev/null 2>&1; then
      printf "%s=installed path=%s " "$tool" "$(command -v "$tool")"
      case "$tool" in
        git) git --version;; bun) bun --version;; omp) omp --version;;
        herdr) herdr --version;; gh) gh --version | awk "NR==1 {print}";;
        tailscale) tailscale version | awk "NR==1 {print}";;
        docker) docker --version;; zsh) zsh --version;;
      esac
    else
      printf "%s=missing\\n" "$tool"
    fi
  done
  test -d "$HOME/.oh-my-zsh" && echo ohmyzsh=installed || echo ohmyzsh=missing
  test -f "$HOME/.omp/agent/config.yml" && echo omp_config=present || echo omp_config=missing
  test -f "$HOME/.config/herdr/config.toml" && echo herdr_config=present || echo herdr_config=missing
'
```

Inspecciona también el checkout y el workspace, sin iniciar servicios:

```bash
bun run elena workspace list --json
bun run elena workspace status <target-id>:<workspace> --json
bun run elena target exec <target-id> -- git -C <repository-root> status --short --branch
```

No imprimas env completos, archivos de credenciales, tokens, claves privadas,
configuración de navegador, `known_hosts` ni bases de datos.

### 3. Comparar y presentar drift

Clasifica cada elemento como `ok`, `drift`, `missing` o `blocked`. Reporta como
mínimo: sistema, arquitectura, usuario, shell, herramienta, versión, path,
fuente de instalación, versión esperada y acción propuesta. La versión esperada
se deriva primero del repositorio o de la workstation local; no se inventan
versiones.

Diferencias importantes:

- Bun contra `packageManager`/`engines` del repositorio.
- OMP contra la versión local y sus preferencias no sensibles.
- Herdr contra el protocolo soportado por la CLI, además de la versión instalada.
- GitHub CLI autenticado sin revelar ni copiar el token.
- Tailscale instalado versus autenticado.
- Docker disponible versus realmente usado; disponibilidad no autoriza su uso.

### 4. Aplicar solo cambios aprobados

Orden recomendado:

1. Paquetes base y shell.
2. Oh My Zsh y dotfiles sanitizados.
3. Herramientas de desarrollo y versiones compatibles.
4. Configuración segura de SSH y OMP.
5. Herdr, integración OMP y reinicio controlado.
6. Workspace existente, sin crear otro si ya está listo.

Reglas de transferencia:

- Copia solo preferencias, aliases y configuraciones no sensibles, incluyendo
  `.zshenv` cuando el entorno use Zsh.
- Elimina de dotfiles líneas con `API_KEY`, `TOKEN`, `SECRET`, `PASSWORD`,
  credenciales, paths de otra máquina o URLs privadas.
- Nunca copies claves privadas SSH. No copies `known_hosts` automáticamente.
- Para secretos usa stdin sobre SSH o el gestor de secretos, archivo remoto
  `0600`, y nunca argumentos, logs o documentación.
- No copies el `.gitconfig` completo si contiene `credential.helper`; sincroniza
  identidad Git solo como una acción separada y explícita.
- No ejecutes `elena init`, `db:push`, migraciones, seeds, resets, Docker,
  Compose ni servicios de producto como parte del setup base.
- No hagas commit ni push en nombre del usuario.

### 5. Verificar el resultado

Después de una mutación, ejecuta solo validaciones focalizadas:

```bash
bun run elena target doctor <target-id> --json
bun run elena workspace status <target-id>:<workspace> --json
bun run elena target exec <target-id> -- bash -lc '
  set -eu
  bash -n "$HOME/.bashrc"
  bash -n "$HOME/.profile"
  zsh -n "$HOME/.zshenv"
  zsh -n "$HOME/.zshrc"
  test "$(getent passwd "$(id -un)" | cut -d: -f7)" = /usr/bin/zsh
  test -d "$HOME/.oh-my-zsh"
  omp --version
  herdr --version
'
```

Valida la presencia del broker únicamente con `test -n`, nunca mostrando su
valor. Confirma que el workspace termine en `ready`, que Herdr tenga protocolo
compatible y que el checkout permanezca limpio respecto de los cambios que no
formaban parte del setup.

## Condición de parada

Finaliza cuando la matriz tenga evidencia suficiente para cada criterio del
baseline. Si falta autenticación de Tailscale, una versión compatible, sudo,
un secreto o autorización de infraestructura, marca el elemento como
`blocked`, explica el comando manual restante y no lo fuerces.
