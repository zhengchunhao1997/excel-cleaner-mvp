#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/server.pid"
LOG_FILE="$DIR/server.log"
ENV_FILE="${DOTENV_CONFIG_PATH:-$DIR/.env.production}"

cmd="${1:-}"

get_port() {
  local port
  port="$(grep -E '^\s*PORT=' "$ENV_FILE" 2>/dev/null | tail -n 1 | cut -d= -f2- | tr -d '[:space:]' || true)"
  if [[ -z "$port" ]]; then
    port="3000"
  fi
  echo "$port"
}

install_deps() {
  cd "$DIR"
  npm ci --omit=dev
}

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" || true)"
    [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
  else
    return 1
  fi
}

start_server() {
  cd "$DIR"
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "missing env file: $ENV_FILE" >&2
    exit 1
  fi
  local port
  port="$(get_port)"
  if [[ ! -f "$DIR/dist/index.js" ]]; then
    echo "missing dist/index.js, please deploy server.tar.gz or run build" >&2
    exit 1
  fi
  if is_running; then
    echo "already running: $(cat "$PID_FILE")"
    exit 0
  fi
  nohup bash -c "NODE_ENV=production DOTENV_CONFIG_PATH='$ENV_FILE' node '$DIR/dist/index.js'" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  local pid
  pid="$(cat "$PID_FILE")"
  sleep 0.7
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "start failed (process exited), last logs:" >&2
    tail -n 80 "$LOG_FILE" 2>/dev/null || true
    exit 1
  fi
  if command -v curl >/dev/null 2>&1; then
    if ! curl -sS "http://127.0.0.1:${port}/" >/dev/null 2>&1; then
      echo "started (pid=$pid) but health check failed on 127.0.0.1:${port}, last logs:" >&2
      tail -n 80 "$LOG_FILE" 2>/dev/null || true
      exit 1
    fi
  fi
  echo "started: $pid (port=$port)"
}

stop_server() {
  if ! [[ -f "$PID_FILE" ]]; then
    echo "not running"
    exit 0
  fi
  local pid
  pid="$(cat "$PID_FILE" || true)"
  if [[ -z "$pid" ]]; then
    rm -f "$PID_FILE"
    echo "not running"
    exit 0
  fi
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for _ in {1..30}; do
      if kill -0 "$pid" 2>/dev/null; then
        sleep 1
      else
        break
      fi
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$PID_FILE"
  echo "stopped"
}

status_server() {
  local port
  port="$(get_port)"
  if is_running; then
    echo "running: $(cat "$PID_FILE") (port=$port, env=$ENV_FILE, log=$LOG_FILE)"
  else
    echo "stopped (port=$port, env=$ENV_FILE, log=$LOG_FILE)"
  fi
}

logs_server() {
  tail -n 200 -f "$LOG_FILE"
}

case "$cmd" in
  install)
    install_deps
    ;;
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    start_server
    ;;
  status)
    status_server
    ;;
  logs)
    logs_server
    ;;
  *)
    echo "usage: bash run.sh {install|start|stop|restart|status|logs}" >&2
    exit 1
    ;;
esac
