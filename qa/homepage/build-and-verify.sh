#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/imon-runtime/node/bin:$PATH"
npm run build
python3 qa/homepage/run-client-review-suite.py
