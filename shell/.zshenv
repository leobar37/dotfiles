if [ -r "$HOME/.cargo/env" ]; then
  . "$HOME/.cargo/env"
fi

if [ -r "$HOME/.config/omp/broker.env" ]; then
  set -a
  . "$HOME/.config/omp/broker.env"
  set +a
fi
