# corerope: research, experiments, chart data and the site.
#
#   make venv     Python 3.12 environment for the experiments (numpy, yowasp-yosys) in .venv/
#   make synth    re-run the 15 wired-layer syntheses with Yosys (minutes; build/synth/)
#   make data     write data/*.json from the research and the experiment scripts
#   make check    reproduce experiments/RESULTS.md and test the site's port of the cost model
#   make site     build the website (site/), reading research/ and data/
#   make dev      run the website locally
#
# CPU-heavy steps run under ~/.claude/claude-core/bin/heavy when it exists (a shared machine).

PY := $(if $(wildcard .venv/bin/python),.venv/bin/python,python3)
HEAVY := $(if $(wildcard $(HOME)/.claude/claude-core/bin/heavy),$(HOME)/.claude/claude-core/bin/heavy,)

.PHONY: venv synth data check site dev lint test

venv:
	uv venv .venv --python 3.12 || python3 -m venv .venv
	uv pip install --python .venv/bin/python -r experiments/requirements.txt || .venv/bin/pip install -r experiments/requirements.txt

synth:
	$(HEAVY) scripts/synth.sh

data:
	$(PY) scripts/data/costmodel_data.py
	$(PY) scripts/data/decode_energy.py
	$(PY) scripts/data/research_tables.py
	$(PY) scripts/data/gates.py
	$(HEAVY) $(PY) scripts/data/spw.py

check:
	$(PY) scripts/check_results.py
	pnpm --filter @corerope/site test

site:
	pnpm build

dev:
	pnpm dev

lint:
	pnpm lint

test:
	pnpm test
