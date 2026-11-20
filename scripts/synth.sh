#!/usr/bin/env bash
# Re-runs the wired-layer gate-count experiment: all 15 designs recorded in experiments/RESULTS.md,
# with the unmodified scripts in experiments/wired-layers/ (gen.py, gen2.py, run.sh, run2.sh).
#
#   scripts/synth.sh            synthesize every design into build/synth/, print each result line
#
# The scripts write their Verilog and Yosys logs into the directory they run from, so they run from
# a copy in build/synth/ and the experiments folder stays clean. Needs python3 with numpy and
# yowasp-yosys on PATH: `make venv` puts both in .venv/, which this script prefers.
# scripts/data/gates.py then reads the logs into data/gates.json and checks them against the
# counts recorded in experiments/RESULTS.md.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -x "$root/.venv/bin/python" ]] && export PATH="$root/.venv/bin:$PATH"
command -v yowasp-yosys >/dev/null || {
  echo "synth: yowasp-yosys not found (run: make venv)" >&2
  exit 1
}

work="$root/build/synth"
mkdir -p "$work"
cp "$root"/experiments/wired-layers/{gen.py,gen2.py,run.sh,run2.sh} "$work/"
cd "$work"

# The 15 designs of experiments/RESULTS.md, by the arguments their file names encode.
#   run.sh  KIND N M ABITS     -> KIND_NxM_aABITS.v      (gen.py)
#   run2.sh KIND N M ABITS G   -> KIND_NxM_aABITS_gG.v   (gen2.py)
singles=(
  "mac 1 1 8" "mac 1 1 4"
  "int4 32 32 8" "int4 32 32 4"
  "ternary 32 32 8" "ternary 32 32 4" "ternary 64 64 8"
)
groups=(
  "direct 48 64 8 1" "spw 48 64 8 3" "spw 48 64 8 4" "spw 48 64 8 6"
  "direct 48 256 8 1" "spw 48 256 8 3" "spw 48 256 8 4" "spw 48 256 8 6"
)
for a in "${singles[@]}"; do
  # shellcheck disable=SC2086
  bash run.sh $a
done
for a in "${groups[@]}"; do
  # shellcheck disable=SC2086
  bash run2.sh $a
done
