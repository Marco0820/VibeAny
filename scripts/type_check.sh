#!/usr/bin/env bash
payload=$(cat)                     # 消耗标准输入
cd "$CLAUDE_PROJECT_DIR" || exit 2

TSC_OUT=$(npx --no-install tsc --noEmit 2>&1)
if [ $? -ne 0 ]; then
  echo "$TSC_OUT" >&2             # 将结果反馈给 CLI
  exit 2
fi
exit 0                             # 检查通过时静默退出
