"""Thousandfold cost model: energy and dollars per solved task vs B2026.
B2026 = DeepSeek-V4-Pro-class on GB300 NVL72, $0.12 per M output tokens at ~27 tok/s/user (InferenceX via Silicon Report),
energy per output token ~0.5-2 J (derived; Rubin measured ~10 J at 300 tok/s/user, B200 ~0.36 J on a 5B-active model)."""
S = {  # low (pessimistic), central, high (optimistic)
 'base_J_per_tok':      (0.5,   1.0,   2.0),
 'base_usd_per_Mtok':   (0.12,  0.12,  0.12),
 'core_active_B':       (24,    12,    8),      # wired ternary reasoning core, billions of weights
 'pJ_per_weight_op':    (0.3,   0.1,   0.03),   # wired ternary + shared partial sums, incl. wiring
 'act_sparsity_gain':   (1.0,   2.0,   4.0),    # event-driven: zero activations do not toggle fanout
 'data_mJ_per_tok':     (0.6,   0.2,   0.08),   # recurrent state + sparse global attn + memory-tier lookups
 'overhead_mult':       (1.6,   1.3,   1.15),   # leakage, I/O, control, sampling
 'tok_ratio':           (1.5,   0.67,  0.25),   # new tokens per task / baseline tokens per task
 'deep_share':          (0.10,  0.05,  0.02),   # tasks escalated to a 5x larger wired deep core
 'deep_cost_ratio':     (6,     5,     5),
 'gpu_share':           (0.01,  0.001, 0.0),    # tasks that still fall back to B2026-class GPUs
 'set_capex_usd':       (40e3,  15e3,  8e3),    # one core set: dies + package + HBM for state
 'set_power_W':         (600,   1000,  2000),
 'utilization':         (0.35,  0.5,   0.7),
 'life_years':          (3,     3,     3),
 'usd_per_kWh':         (0.10,  0.08,  0.06),
 'pue':                 (1.4,   1.3,   1.2),
 'nre_usd':             (150e6, 40e6,  10e6),   # per frozen-core generation (masks + design + verification)
 'life_tokens':         (1e16,  3e16,  1e17),   # tokens served by one frozen core generation
 'memtier_usd_per_Mtok':(2e-4,  5e-5,  2e-5),
}
def run(i):
    p = {k: v[i] for k, v in S.items()}
    core_mJ = p['core_active_B']*1e9 * p['pJ_per_weight_op']*1e-12 / p['act_sparsity_gain'] * 1e3
    tok_mJ = (core_mJ + p['data_mJ_per_tok']) * p['overhead_mult']
    # per-token cost of the tiered wired fleet (deep core priced as a multiple), then GPU fallback by share
    wired_mix = (1 - p['deep_share']) + p['deep_share'] * p['deep_cost_ratio']
    E_new_tok = tok_mJ * 1e-3 * wired_mix                         # J per token, wired tiers
    thr = p['set_power_W'] / (tok_mJ * 1e-3)                       # tok/s per set at full power
    capex = p['set_capex_usd'] / (p['life_years']*3.156e7 * thr * p['utilization']) * 1e6
    energy_usd = tok_mJ*1e-3 * p['pue'] / 3.6e6 * p['usd_per_kWh'] * 1e6
    nre = p['nre_usd'] / p['life_tokens'] * 1e6
    usd_new_tok = (capex + energy_usd + p['memtier_usd_per_Mtok']) * wired_mix + nre
    # per task: tokens ratio, then Amdahl blend with GPU fallback at baseline cost per task
    E_task = (1-p['gpu_share']) * E_new_tok * p['tok_ratio'] + p['gpu_share'] * p['base_J_per_tok']
    U_task = (1-p['gpu_share']) * usd_new_tok * p['tok_ratio'] + p['gpu_share'] * p['base_usd_per_Mtok']
    return dict(core_mJ=core_mJ, tok_mJ=tok_mJ, tok_per_s_per_set=thr,
                usd_per_Mtok=dict(capex=capex, energy=energy_usd, nre=nre, total=usd_new_tok),
                energy_x_per_token=p['base_J_per_tok']/E_new_tok, usd_x_per_token=p['base_usd_per_Mtok']/usd_new_tok,
                energy_x_per_task=p['base_J_per_tok']/E_task, usd_x_per_task=p['base_usd_per_Mtok']/U_task)
for i, name in enumerate(['low', 'central', 'high']):
    r = run(i)
    print(f"{name:8s} core {r['core_mJ']:.3f} mJ | token {r['tok_mJ']:.3f} mJ | {r['tok_per_s_per_set']:,.0f} tok/s/set | "
          f"$/Mtok capex {r['usd_per_Mtok']['capex']:.5f} energy {r['usd_per_Mtok']['energy']:.6f} nre {r['usd_per_Mtok']['nre']:.5f} total {r['usd_per_Mtok']['total']:.5f}")
    print(f"         energy x/token {r['energy_x_per_token']:,.0f}  x/task {r['energy_x_per_task']:,.0f} | dollars x/token {r['usd_x_per_token']:,.0f}  x/task {r['usd_x_per_task']:,.0f}")
# Amdahl illustration: GPU fallback share caps the gain
print("Amdahl cap (energy x/task, central otherwise):")
for s in [0.0, 0.0005, 0.001, 0.01, 0.05]:
    S['gpu_share'] = (S['gpu_share'][0], s, S['gpu_share'][2]); print(f"  fallback {s:.2%}: {run(1)['energy_x_per_task']:,.0f}x energy, {run(1)['usd_x_per_task']:,.0f}x dollars")
print("With via-programmed fabric (NRE per model ~$3M central) and 0.05% GPU fallback:")
S['nre_usd'] = (20e6, 3e6, 1e6); S['gpu_share'] = (0.01, 0.0005, 0.0)
for i, name in enumerate(['low', 'central', 'high']):
    r = run(i); u = r['usd_per_Mtok']
    print(f"  {name:8s} energy x/task {r['energy_x_per_task']:,.0f} | dollars x/task {r['usd_x_per_task']:,.0f} | $/Mtok capex {u['capex']:.5f} nre {u['nre']:.5f} total {u['total']:.5f}")

