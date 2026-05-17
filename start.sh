#!/usr/bin/env bash
#
# 物理实验室 — 一键启动脚本
#
# 用法：
#   ./start.sh         # 启动生产服务
#   ./start.sh --dev   # 启动开发模式 (热重载)
# ---------------------------------------------------------------------------

set -euo pipefail
cd "$(dirname "$0")"

bold="\033[1m"; green="\033[32m"; yellow="\033[33m"; red="\033[31m"; cyan="\033[36m"; reset="\033[0m"
ok()   { printf "${green}✓${reset} %s\n" "$*"; }
warn() { printf "${yellow}!${reset} %s\n" "$*"; }
die()  { printf "${red}✗${reset} %s\n" "$*"; exit 1; }

# Dev mode shortcut
if [ "${1:-}" = "--dev" ]; then
  ok "开发模式启动 (热重载)"
  exec npm run dev
fi

# Production checks
[ -d node_modules ] || die "缺 node_modules，请先跑：./install.sh"
[ -d dist ] || die "缺 dist/，请先跑：./install.sh"
[ -d dist-server ] || die "缺 dist-server/，请先跑：./install.sh"
[ -f .env ] || die "缺 .env，请先跑：./install.sh"

# Load env vars
set -a
# shellcheck disable=SC1091
. ./.env
set +a

PORT="${PORT:-4444}"

# Kill stale process on the port
if command -v lsof >/dev/null 2>&1; then
  EXISTING=$(lsof -ti ":$PORT" 2>/dev/null || true)
  if [ -n "$EXISTING" ]; then
    warn "端口 $PORT 已被占用 (PID: $EXISTING)，先 kill 掉"
    kill -9 $EXISTING 2>/dev/null || true
    sleep 1
  fi
fi

URL="http://localhost:$PORT"
printf "${bold}🚀 启动物理实验室${reset}\n"
printf "   端口：${cyan}%s${reset}\n" "$PORT"
printf "   访问：${cyan}%s${reset}\n" "$URL"

# Try to open browser (macOS / Linux)
( sleep 2; (command -v open >/dev/null && open "$URL") || (command -v xdg-open >/dev/null && xdg-open "$URL") || true ) &

exec node dist-server/server/index.js
