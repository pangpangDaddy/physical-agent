#!/usr/bin/env bash
#
# 物理实验室 — 打包脚本（开发者用）
#
# 用法：
#   ./pack.sh
#
# 生成 release/physics-lab-<version>.tar.gz, 包含运行所需全部文件。
# 终端用户拿到 tarball 后只需：
#   tar -xzf physics-lab-x.x.x.tar.gz
#   cd physics-lab-x.x.x
#   ./install.sh
#   ./start.sh
# ---------------------------------------------------------------------------

set -euo pipefail
cd "$(dirname "$0")"

bold="\033[1m"; green="\033[32m"; yellow="\033[33m"; cyan="\033[36m"; reset="\033[0m"
ok() { printf "${green}✓${reset} %s\n" "$*"; }
say(){ printf "${bold}%s${reset}\n" "$*"; }

VERSION=$(node -p "require('./package.json').version")
NAME="physics-lab-$VERSION"
OUT_DIR="release"
STAGE_DIR="$OUT_DIR/$NAME"
TARBALL="$OUT_DIR/$NAME.tar.gz"

say "[1/4] 清理旧构建"
rm -rf "$OUT_DIR/$NAME" "$TARBALL"
mkdir -p "$STAGE_DIR"

say "[2/4] 生产构建"
npm run build 2>&1 | tail -3

say "[3/4] 拷贝运行所需文件到 $STAGE_DIR"
# Source code (server is .js after tsc; we still ship server/ source for tsx fallback)
cp -R dist "$STAGE_DIR/"
cp -R dist-server "$STAGE_DIR/"
cp -R dist-cli "$STAGE_DIR/"
cp -R server "$STAGE_DIR/"        # for dev mode
cp -R public "$STAGE_DIR/"
cp -R scenario "$STAGE_DIR/"
cp -R md_output "$STAGE_DIR/"
mkdir -p "$STAGE_DIR/.claude"
cp .claude/agent-registry.json "$STAGE_DIR/.claude/"
cp package.json package-lock.json "$STAGE_DIR/"
cp install.sh start.sh "$STAGE_DIR/"
cp README.md LICENSE "$STAGE_DIR/" 2>/dev/null || true

# .env.example so users know what fields to set
cat > "$STAGE_DIR/.env.example" <<'EOF'
# 复制为 .env 并填入你的百炼 API key (install.sh 会帮你做)
DASHSCOPE_API_KEY=sk-sp-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DASHSCOPE_BASE_URL=https://coding.dashscope.aliyuncs.com/apps/anthropic
DASHSCOPE_MODEL=qwen3-coder-plus
PORT=4444
EOF

chmod +x "$STAGE_DIR/install.sh" "$STAGE_DIR/start.sh"

# Drop the bulky test fixtures + .DS_Store
find "$STAGE_DIR" -name ".DS_Store" -delete

say "[4/4] 打 tarball"
tar -czf "$TARBALL" -C "$OUT_DIR" "$NAME"

SIZE_HUMAN=$(du -h "$TARBALL" | awk '{print $1}')
echo
ok "打包完成"
printf "   文件：${cyan}%s${reset}  (${cyan}%s${reset})\n" "$TARBALL" "$SIZE_HUMAN"
printf "   解包后跑：\n"
printf "     ${bold}tar -xzf %s${reset}\n" "$TARBALL"
printf "     ${bold}cd %s${reset}\n" "$NAME"
printf "     ${bold}./install.sh${reset}\n"
printf "     ${bold}./start.sh${reset}\n"
