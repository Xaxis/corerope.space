# Recorded experiment results (Nov 19, 2026)

## Wired-layer gate counts (Yosys 0.71, synth -flatten -noabc, generic gates)

```
direct_48x256_a8_g1.v  cells=320496
direct_48x64_a8_g1.v  cells=86177
int4_32x32_a4.v  cells=50071
int4_32x32_a8.v  cells=76776
mac_1x1_a4.v  cells=315
mac_1x1_a8.v  cells=435
spw_48x256_a8_g3.v  cells=217214
spw_48x256_a8_g4.v  cells=198169
spw_48x256_a8_g6.v  cells=224306
spw_48x64_a8_g3.v  cells=61816
spw_48x64_a8_g4.v  cells=61715
spw_48x64_a8_g6.v  cells=73895
ternary_32x32_a4.v  cells=20477
ternary_32x32_a8.v  cells=31535
ternary_64x64_a8.v  cells=120218
```

Gates per weight: stored-weight 4-bit MAC 435 per op (8-bit act), 315 (4-bit act); wired int4 32x32 75.0 (a8), 48.9 (a4); wired ternary 32x32 30.8 (a8), 20.0 (a4); ternary 64x64 29.4; ternary 48x64 direct 28.05, SPW g3 20.12, g4 20.09, g6 24.05; ternary 48x256 direct 26.08, SPW g3 17.68, g4 16.13, g6 18.25.

## SPW add-count model (adds.py): direct adds / SPW adds

```
48 64 g1:1.00x g3:1.60x g4:1.42x g5:1.24x g6:1.06x g7:1.19x g8:1.01x
48 256 g1:1.00x g3:1.86x g4:2.02x g5:1.71x g6:1.27x g7:1.24x g8:1.03x
1024 1024 g1:1.00x g3:1.90x g4:2.31x g5:2.38x g6:1.86x g7:1.35x g8:1.12x
4096 4096 g1:1.00x g3:1.92x g4:2.42x g5:2.84x g6:2.85x g7:2.19x
```

## Cost model (costmodel.py)

```
low      core 7.200 mJ | token 12.480 mJ | 48,077 tok/s/set | $/Mtok capex 0.02511 energy 0.000485 nre 0.01500 total 0.05369
         energy x/token 27  x/task 15 | dollars x/token 2  x/task 1
central  core 0.600 mJ | token 1.040 mJ | 961,538 tok/s/set | $/Mtok capex 0.00033 energy 0.000030 nre 0.00133 total 0.00182
         energy x/token 801  x/task 545 | dollars x/token 66  x/task 89
high     core 0.060 mJ | token 0.161 mJ | 12,422,360 tok/s/set | $/Mtok capex 0.00001 energy 0.000003 nre 0.00010 total 0.00014
         energy x/token 11,502  x/task 46,009 | dollars x/token 885  x/task 3,541
Amdahl cap (energy x/task, central otherwise):
  fallback 0.00%: 1,196x energy, 98x dollars
  fallback 0.05%: 749x energy, 94x dollars
  fallback 0.10%: 545x energy, 89x dollars
  fallback 1.00%: 92x energy, 50x dollars
  fallback 5.00%: 20x energy, 17x dollars
With via-programmed fabric (NRE per model ~$3M central) and 0.05% GPU fallback:
  low      energy x/task 15 | dollars x/task 2 | $/Mtok capex 0.02511 nre 0.00200 total 0.04069
  central  energy x/task 749 | dollars x/task 263 | $/Mtok capex 0.00033 nre 0.00010 total 0.00059
  high     energy x/task 46,009 | dollars x/task 10,533 | $/Mtok capex 0.00001 nre 0.00001 total 0.00005
```
