if [ -r "$HOME/.cargo/env" ]; then
  . "$HOME/.cargo/env"
fi

if [ -r "$HOME/.config/omp/broker.env" ]; then
  set -a
  . "$HOME/.config/omp/broker.env"
  set +a
fi

# dotfiles: herramientas locales siempre en PATH (workstation + VPS)
case ":$PATH:" in
  *":$HOME/.bun/bin:"*) ;;
  *) export PATH="$HOME/.bun/bin:$HOME/.local/bin:$HOME/.npm-global/bin:$PATH" ;;
esac
