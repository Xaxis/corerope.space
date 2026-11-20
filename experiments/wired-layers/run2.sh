#!/bin/bash
read f nnz tot < <(python3 gen2.py "$@")
yowasp-yosys -p "read_verilog $f; synth -flatten -noabc -top top; opt -full; opt_clean; stat" > "log_$f.txt" 2>&1
cells=$(grep -E "^\s+[0-9]+ cells$" "log_$f.txt" | tail -1 | grep -oE "[0-9]+")
python3 -c "c=int('${cells:-0}'); print(f'$1 N=$2 M=$3 a=$4 g=$5 gates={c} gates/weight={c/$tot:.2f}')"

