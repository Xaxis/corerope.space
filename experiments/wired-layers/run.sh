#!/bin/bash
read nnz tot < <(python3 gen.py "$@")
f="$1_$2x$3_a$4.v"
yowasp-yosys -p "read_verilog $f; synth -flatten -noabc -top top; opt -full; opt_clean; stat" > "log_$f.txt" 2>&1
cells=$(grep -E "^\s+[0-9]+ +cells$|^\s+[0-9]+ cells$" "log_$f.txt" | tail -1 | grep -oE "[0-9]+")
[ -z "$cells" ] && cells=$(grep -iE "number of cells" "log_$f.txt" | tail -1 | grep -oE "[0-9]+$")
python3 -c "
c=int('${cells:-0}'); t=$tot; n=$nnz
print(f'$1 N=$2 M=$3 abits=$4 weights={t} nonzero={n} gates={c} gates/weight={c/t:.2f} gates/nonzero={c/max(n,1):.2f}')"

