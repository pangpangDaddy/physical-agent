#!/usr/bin/env bash
#
# 物理实验室 (Physics Lab) — 一键安装脚本
#
# 用法：
#   ./install.sh
#
# 这个脚本会：
#   1. 检查 Node.js (≥ 18)
#   2. 装 npm 依赖
#   3. 配置 .env（询问百炼 DASHSCOPE_API_KEY，不填用默认值）
#   4. 构建生产代码 (dist/, dist-server/, dist-cli/)
#
# 装完后用 ./start.sh 启动。
# ---------------------------------------------------------------------------

set -euo pipefail
cd "$(dirname "$0")"

bold="\033[1m"; green="\033[32m"; yellow="\033[33m"; red="\033[31m"; reset="\033[0m"
say()  { printf "${bold}%s${reset}\n" "$*"; }
ok()   { printf "${green}✓${reset} %s\n" "$*"; }
warn() { printf "${yellow}!${reset} %s\n" "$*"; }
die()  { printf "${red}✗${reset} %s\n" "$*"; exit 1; }

# 1. Node check
say "[1/4] 检查 Node.js 环境"
if ! command -v node >/dev/null 2>&1; then
  die "找不到 node — 请先装 Node.js ≥ 18：https://nodejs.org/"
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  die "Node.js 版本过低 ($(node -v))，请升级到 ≥ 18"
fi
ok "Node.js $(node -v)"

if ! command -v npm >/dev/null 2>&1; then
  die "找不到 npm — 请重装 Node.js"
fi
ok "npm $(npm -v)"

# 2. npm install
say "[2/4] 安装 npm 依赖（首次可能 1-3 分钟）"
if [ -f package-lock.json ]; then
  npm ci 2>&1 | tail -5 || npm install 2>&1 | tail -5
else
  npm install 2>&1 | tail -5
fi
ok "依赖安装完成"

# 3. .env config
say "[3/4] 配置百炼 LLM API key"
if [ ! -f .env ]; then
  DEFAULT_KEY="sk-sp-1483107c300e4b15961dc082de6420c0"
  printf "  请粘贴你的 DashScope (百炼) API key (回车=用默认值): "
  if [ -t 0 ]; then
    read -r USER_KEY
  else
    USER_KEY=""
  fi
  API_KEY="${USER_KEY:-$DEFAULT_KEY}"
  cat > .env <<EOF
DASHSCOPE_API_KEY=$API_KEY
DASHSCOPE_BASE_URL=https://coding.dashscope.aliyuncs.com/apps/anthropic
DASHSCOPE_MODEL=qwen3.6-plus
PORT=4444
EOF
  ok ".env 已生成"
else
  ok ".env 已存在，跳过"
fi

# 4. Build production bundles
say "[4/4] 构建生产代码"
npm run build 2>&1 | tail -3
ok "构建完成"

echo
say "🎉 安装完成！"
echo "   启动：${bold}./start.sh${reset}"
echo "   或在 dev 模式跑：${bold}npm run dev${reset}"
