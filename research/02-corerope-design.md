# Corerope design: inventing a 1000x cheaper frontier LLM

Formerly titled "Thousandfold". Written Nov 19, 2026. Built on the companion report (01-report-path-to-1000x.md) and the experiments in /experiments.

## Summary

The invented stack reaches about **750x less energy and about 260x lower cost per solved task** than a late-2026 frontier deployment in the central case of its cost model. Energy passes 1000x if no task falls back to GPUs; dollars reach 1000x only in the optimistic case. The range is wide, from 15x to 46,000x in energy, because one scientific bet decides most of it: whether a ~12B-parameter ternary reasoning core paired with a huge lookup memory can match frontier quality.

The stack has seven parts:

1. Move knowledge out of the matrix multiplies, so that per-token compute scales with reasoning and not with facts.
2. Freeze that small reasoning core into silicon as ternary wiring, not stored weights, so no weight is ever fetched.
3. Share partial sums across output rows. A synthesis test showed **2.4x fewer gates per weight than wired 4-bit** and a further 1.6x from sharing.
4. Make the core freezable for years, so every model update lands in rewritable memory instead of a new chip.
5. Program the silicon in a single via layer, so a new model costs about $3M of masks instead of $40M.
6. Price tokens per task into training, so cheap tokens are not spent on longer reasoning.
7. Keep every task on the new stack: the cost model shows a 1% fallback to GPU serving caps the energy gain at about 92x.

Nothing here is proven at scale. Each part comes with the first experiment that would falsify it.

## Where the remaining 1000x hides

A late-2026 frontier token costs about **$0.12 per million output tokens and roughly 0.5 to 2 J**. That is DeepSeek-V4-Pro-class serving on GB300 NVL72 at ~27 tok/s per user ([Silicon Report, citing InferenceX](https://www.siliconreport.com/inference-cost-per-token-economics-2026-22d409d7)). The joules are derived from that price and from SemiAnalysis's Rubin measurement of ~10 J per token at 300 tok/s per user. Ordinary engineering will not find 1000x inside that token, because the companion report found the levers that remain on GPUs mostly overlap.

The headroom is in the gap between what GPUs spend and what physics charges. An H100 spends **11.68 pJ to move one bit from HBM and 0.52 pJ per tensor-core operation** ([arXiv 2607.26571](https://arxiv.org/pdf/2607.26571)). An 8-bit digital adder in modern silicon switches a few femtojoules. The thermodynamic floor is about 10^8 below current practice, so physics is not the binding limit; architecture is.

| Cost term in a B2026 token | Why it is large today | Floor it could reach | Invention that attacks it |
|---|---|---|---|
| Weights moved per token | Stored weights are fetched from HBM or SRAM for every use, amortized only by huge batches | Zero: weights that are wires are never fetched | Wired-weight ternary silicon (2) |
| Multiply-accumulate energy | General FP4 multipliers, about 0.1 to 0.5 pJ per operation with operand movement | Tens of fJ: ternary weights need only add, subtract or skip | Wired ternary plus shared partial sums (2) |
| Parameters touched per token | Knowledge lives in the same weights that do reasoning, so 49B active weights fire per token | A small reasoning core plus O(1) lookups | Split mind (1), lookup-in-storage (4) |
| Per-user context state | KV cache grows with context and is re-read every token | A fixed recurrent state plus a few KB of sparse attention reads | Context cartridges (6) |
| Tokens per task | Rose from ~35k to ~59k median in one Artificial Analysis index revision | Several times fewer at equal score (already a 4.4x spread between near-equal models) | Cost-priced tokens (5) |
| Capital and mask cost per token | Accelerators cost ~$50k+; a hardwired chip needs new masks per model | Commodity silicon programmed in one via layer | Freezable core (3), via-programmed fabric (2) |

Each row's floor is reachable only if the row above it is solved too. Once weights stop moving, per-user state becomes the dominant data movement; once compute is nearly free, capital and mask cost dominate dollars. That ordering explains why the inventions come as a set.

## Invention 1: Split mind, a small reasoning core and a vast lookup memory

The split mind stores knowledge in a lookup memory of tens of trillions of parameters and keeps only reasoning in a ~12B-weight core. Per-token compute then scales with how hard the thinking is, not with how much the model knows. Today a frontier MoE fires ~49B weights per token largely because facts and skills share the same matrices.

**The prior art proves the primitive.** DeepSeek's Engram (January 2026) adds O(1) hashed N-gram lookups beside MoE layers and offloads a 100B-parameter table to host DRAM with under 3% throughput loss ([Engram paper](https://arxiv.org/html/2601.07372v1); [Introl summary](https://introl.com/fr/blog/deepseek-engram-conditional-memory-architecture-january-2026)). Meta's memory layers outperform models using more than twice the compute on factual tasks ([Memory Layers at Scale](https://icml.cc/virtual/2025/poster/46172)).

**The new step is the objective.** Engram found a U-shaped law: at fixed total parameters and training FLOPs, about 75 to 80% of sparse capacity should go to compute and 20 to 25% to memory. That law prices a memory parameter and a compute parameter equally. At inference on wired silicon they are not equal: a compute weight costs die area and switching energy on every token, while a memory entry costs a few bits of NAND or DRAM and is read only when addressed. If inference cost per useful token is the objective, a memory parameter is roughly 1000x cheaper, and the optimum should move far toward memory. Nobody has published that inference-priced allocation law; deriving it is the first experiment.

**The design.**

- A reasoning core of ~12B ternary weights, hybrid recurrent and sparse attention, trained as the only compute path.
- A memory tier of 10 to 50 trillion parameters at 2 to 4 bits (2.5 to 25 TB), keyed by learned product keys plus Engram-style hashed N-grams, read at every fourth layer with context gating.
- Roughly 2 MB of memory read per token. At 3 to 5 pJ per bit from DRAM or in-die NAND, that is 50 to 80 microjoules, about a tenth of the core's energy.
- A fact-free core: during training, fact-bearing spans are routed so their loss can only be lowered through memory reads (knowledge dropout on the core path), so facts are not memorized twice.

**Why it could fail.** Knowledge and reasoning may not separate cleanly; multi-hop reasoning over facts may need the facts inside the computation, not beside it. Small models also emit more tokens: Qwen3.5-9B used ~260M output tokens on the Artificial Analysis index against 86M for Qwen3.5-397B, which the cost model charges against this invention.

## Invention 2: Wired-weight ternary silicon

In wired-weight silicon a weight is not a number in memory but a connection: each input wire feeds an adder tree's plus input, its minus input, or nothing. No weight is ever fetched, and no multiplier exists. A synthesis test found **wired ternary needs ~30 gates per weight against ~75 for wired 4-bit**, and sharing partial sums cuts that a further 1.6x at 256 output rows.

The test generated hardwired matrix-vector layers with random weights as Verilog and synthesized them with Yosys 0.71 into generic gates:

| Design (8-bit activations unless noted) | Gates per weight |
|---|---|
| Stored-weight 4-bit MAC, the GPU-style unit, per operation | 435, plus the weight fetch |
| Wired 4-bit weights, 32 x 32 layer | 75.0 |
| Wired ternary, 32 x 32 layer (40% zeros) | 30.8 |
| Wired ternary, 4-bit activations | 20.0 |
| Wired ternary, 48 x 256, direct | 26.1 |
| Wired ternary, 48 x 256, shared partial sums (groups of 4) | 16.1 |

Gate counts are a proxy for switching energy, not a measurement of it. They exclude wire capacitance, which dominates in fully spatial designs, and they come from Yosys without ABC logic optimization (the WebAssembly build's ABC step did not run), so absolute numbers are high but the ratios are like for like.

**Shared partial-sum wiring (SPW) is the new trick.** With fixed weights, every signed combination of a small input group, such as x1 minus x3 plus x4, can be built once and tapped by every output row that needs it. An add-count model puts the saving at **2.4x for groups of 4 and 2.8x for groups of 5 to 6 at a 4096 x 4096 layer**, rising with layer width. CPU kernels already exploit lookup tables of this kind (T-MAC style); building it as fixed wiring is the new part.

**Three more pieces complete the chip.**

- Event-driven sparsity. A zero activation holds its wires still, so nothing downstream switches. On GPUs, activation sparsity barely helps at serving batch; here dynamic energy falls with every zero. The model credits 2x centrally (TurboSparse-style training reaches ~90% sparsity).
- Multi-stream pipelining. Every layer has its own silicon, so tokens from thousands of users flow through layer by layer. Throughput is set by power and by per-user state bandwidth, not by weight bandwidth: about 1M tokens per second per 1 kW set in the central case.
- A via-programmed fabric. The precomputed group sums are generic: at full width almost every combination is used, so the sum wiring is fixed. Each row input then chooses one sum wire with a single via. A new model becomes one via mask (structured-ASIC style, and Taalas already respins only two masks per model), cutting per-model NRE from ~$40M to an assumed ~$3M.

**The energy assumption to test.** The model assumes 0.1 pJ per weight-operation including wiring (range 0.03 to 0.3). For comparison, Taalas HC1 implies roughly 2 pJ per parameter per token for Llama-3.1-8B at 4 bits (250 W at ~16,000 tok/s, derived). The 20x gap rests on ternary (2.4x), shared sums (~2.5x), event-driven sparsity (~2x) and lower static power; it must be shown in post-layout simulation before anyone believes it. Area is the cost: 12B weights at ~12 gates each is ~1.5 x 10^11 gates, several reticle-size dies or a wafer-scale part.

## Invention 3: ROM core, RAM mind

A frozen core must stay competitive for two to three years while frontier models change every few months, so it is trained to be frozen. Every later improvement lands in the rewritable memory tier or in small SRAM adapters, never in the silicon. This is what turns hardwiring from a per-model expense into an amortized platform.

**The training contract.**

1. Time-slice the pretraining data. In late phases, repeatedly freeze the core and train only the memory tier and adapters on the next slice, then score the result against a model trained on everything.
2. Optimize the core for that score (freeze regret) as an explicit objective, so it learns representations that later knowledge can plug into rather than overwrite.
3. Give each layer a writable low-rank adapter of ~0.5% of its weights in on-chip SRAM. Skills, style and fixes ship as adapters and memory writes, selectable per task.
4. Reserve unused capacity: ~5% of each layer's rows are wired but zero-initialized with gated outputs, available to adapters later.

**The milestone that matters.** Freeze regret at 12 months should be under 1 benchmark point against a retrained model of the same size, and under 3 points at 24 months. If regret grows faster, the chip's useful life shortens, and the per-model NRE term in the cost model rises with it.

**What it cannot fix.** A flaw inside the frozen reasoning itself, such as a systematic logic error or an unsafe behavior adapters cannot suppress, survives until the next tape-out. The fleet therefore needs a fast path to disable a core generation, and the deep-core and GPU fallbacks in the Amdahl section double as that safety valve.

## Invention 4: Lookup-in-storage memory tier

The memory tier lives in storage that computes: each memory die gathers the rows a token asks for, sums them with their gate weights on the die, and returns one small vector. Only about 4 KB per lookup crosses the bus instead of every retrieved row, and tens of terabytes of knowledge cost about as much as a few hundred gigabytes of HBM.

**Two levels, split by when the address is known.**

| Level | Addressed by | Stored in | Size | Why it works |
|---|---|---|---|---|
| Static memory | Hashed N-grams of the input tokens, Engram style | 3D NAND with on-die reduction logic | 10 to 50T parameters | Addresses are known the moment a token arrives, so ~20 to 50 microsecond page reads are prefetched and hidden inside a ~20 ms decode step |
| Contextual memory | Learned product keys from the hidden state | DRAM beside the core | ~1T parameters | Addresses depend on computation, so they need DRAM latency |

Engram's deterministic addressing is what makes the NAND level possible: DeepSeek already prefetches its table over PCIe for that reason. The table is read-only between updates, so NAND write endurance is not a concern; read disturb and error correction are, and need a refresh budget.

**Shared by everyone.** A thousand concurrent streams read the same tables, so storage capital per token is negligible: the cost model charges ~$0.00005 per million tokens. Updates from the ROM core, RAM mind contract are table rewrites, done as rolling bank swaps.

**Open question.** NAND pages are 16 KB or larger while a memory row is a few hundred bytes, so a naive layout wastes most of each read. Tables must be packed so rows that fire together share pages, which is a training-time clustering problem nobody has solved for this use.

## Invention 5: Cutting tokens per task

Cheaper tokens get spent: median output per task rose from ~35k to ~59k tokens in a single Artificial Analysis index revision. Without a counterweight, the core's savings would be absorbed by longer reasoning. The cost model needs only a modest net gain here, **1.5x fewer tokens per task**: roughly 4x from the three mechanisms below, minus ~2.7x because a small core tends to think longer.

- **Joule-priced reinforcement learning.** The reward is correctness minus a price on each trajectory's energy, computed from the chip's own cost model rather than from a token count. The model learns which steps are expensive on this silicon (deep-core escalations, memory misses, long contexts), not just to write less. Length-only methods already show the room: AdaptThink cut response length 53% while gaining 2.4 points, and ThinkPrune halved length for ~2 points.
- **Compiled skills.** When the fleet solves the same sub-procedure many times (a parsing routine, an API workflow, a unit conversion), it is distilled into verified code or an adapter that later tasks call for nearly zero tokens. Agent sessions reuse 85 to 99% of their context across turns, which suggests heavy repetition, but the share of reasoning a skill library can absorb is unmeasured. Skills would be built only from opted-in or synthetic traces and scoped per tenant.
- **Grounded latent reasoning.** The core reasons for a few steps in continuous vectors, then must write a short text checkpoint of what it concluded. A 2026 latent-reasoning method cut 58% of tokens for 2.8 points. The required checkpoints keep reasoning readable for oversight; dropping them would save more tokens but make the model's thinking harder to monitor, a trade this design refuses.

If these fail and the small core needs 1.5x more tokens than the baseline (the pessimistic case), the energy gain per task falls by a further 2.25x relative to the central case.

## Invention 6: Context cartridges for a frozen core

Once weights stop moving, each user's context state is the largest remaining data movement. A cartridge is a trained, compact starting state for a corpus (a codebase, a manual, a long chat history), stored in the memory tier and loaded in one step instead of re-reading the corpus. Because the core never changes, a cartridge trained once stays valid for the chip's whole life.

**Prior art.** Stanford's Cartridges (2025) train a small KV cache offline per corpus through synthetic self-study and amortize that cost across every query on the corpus, with up to ~40x less memory than in-context learning ([Cartridges](https://arxiv.org/abs/2506.06266); [Diaz, 2025](https://arxiv.org/html/2508.17032v2)). A September 2026 follow-up addresses derailment when questions leave the corpus ([Cartridges++](https://arxiv.org/pdf/2609.35621)).

**What is new here.**

- **The cartridge is a recurrent state, not a KV cache.** For a hybrid core it is the recurrent layers' starting state plus a short list of compressed global-attention entries. Its size is fixed whatever the corpus length.
- **Durability.** On GPUs every model update invalidates every cartridge. A frozen core makes them a durable asset, worth training once for any corpus that many sessions share.
- **Checkpointed prefixes.** Agent turns reuse 85 to 99% of their context. The core snapshots its recurrent state at chunk boundaries, so a returning session resumes from a snapshot rather than replaying tokens.

**Budget.** Per user the core holds ~1 MB of recurrent state at 4 bits and reads about 0.5 MB of sparse global attention per token. Together with memory-tier lookups that is ~0.2 mJ per token in the central case, a quarter of the token's energy before overheads and the largest term after the core itself.

## The Amdahl trap and the two-tier fleet

If a share f of tasks still runs at baseline cost, the gain can never exceed 1/f. A cheap tier that handles 95% of tasks while the hard 5% go to frontier GPUs is a 20x system, however cheap the 95% is. For 1000x the GPU share must stay near 0.05%, so the hard tasks need a wired home of their own.

[Diagram: "Every task stays on wired silicon: a 1% GPU fallback caps the gain at 92x". Flow: Task arrives (user or agent) -> Router + verifier (runs on the Tier A core) -> Tier A: 12B wired core (~95% of tasks, ~1 mJ per token, accent) -> escalate -> Tier B core (~60B wired, ~5%) -> last resort -> GPU fallback (at most 0.05% of tasks, warning color). Tier A <-> Memory tier (NAND: 10-50T params; DRAM: ~1T params; cartridges, snapshots) via "lookups". Footnote: cost model, central case: GPU fallback share of 0% gives 1,196x less energy per task; 0.1% gives 545x, 1% gives 92x and 5% gives 20x.]

Tier B is the same design scaled up: a ~60B-weight wired core on wafer-scale or multi-die silicon, sharing the memory tier, at about 5x Tier A's cost per token. With 5% of tasks escalated, the blended fleet costs 1.2x Tier A alone. GPUs stay only as the safety valve for a disabled core generation. The open risk is the hard-task share: if more than ~10% of frontier tasks exceed what Tier A can do, Tier B grows and the central estimate falls.

## Multiplier budget vs the late-2026 frontier

In the central case the stack is **749x cheaper in energy and 263x cheaper in dollars per solved task**, and 1000x lies inside both ranges. The spread runs from 15x to 46,000x in energy because the assumptions compound: a core twice as large, three times more energy per weight and no sparsity gain together cost two orders of magnitude.

[Chart: "Central case: 749x less energy and 263x lower cost per task". Dot-and-whisker range plot on a log x axis (1x to 100,000x) with a dashed 1000x target line. Data (pessimistic / central / optimistic): Energy per task 15 / 749 / 46,009; Dollars per task 2 / 263 / 10,533; Energy per token 27 / 801 / 11,502; Dollars per token 3 / 203 / 2,633. Per-task rows in the accent color, per-token rows grey.]

The model prices one core set (dies, package and HBM for per-user state) against its throughput, adds energy, per-model NRE and memory-tier storage, then applies tokens per task and the Tier B and GPU shares. Its main assumptions:

| Assumption | Pessimistic | Central | Optimistic |
|---|---|---|---|
| Tier A core size, ternary weights | 24B | 12B | 8B |
| Energy per weight-operation, incl. wiring | 0.3 pJ | 0.1 pJ | 0.03 pJ |
| Event-driven sparsity gain | 1x | 2x | 4x |
| Tokens per task vs baseline | 1.5x more | 1.5x fewer | 4x fewer |
| Tasks to Tier B / to GPUs | 10% / 1% | 5% / 0.05% | 2% / 0% |
| Core-set capital at utilization | $40k at 35% | $15k at 50% | $8k at 70% |
| Per-model NRE over lifetime tokens | $20M over 10^16 | $3M over 3 x 10^16 | $1M over 10^17 |
| Baseline energy per token | 0.5 J | 1 J | 2 J |

**Dollars lag energy because capital dominates once energy is nearly free.** In the central case a million tokens costs about $0.00059: capital is two thirds of it, NRE 17%, memory storage 10% and electricity only 6%. Reaching 1000x in dollars needs cheaper or harder-worked silicon, not more efficiency.

## Experiments: what was tested, and what to run next

This session tested only the silicon arithmetic: synthesized gate counts for wired layers, an add-count model of shared partial sums at full layer width, and the cost model behind the chart. Everything about model quality is untested. The seven experiments below would confirm or kill the design, ordered so that the cheapest decisive ones run first.

| Order | Experiment | Tests | Pass bar | If it fails |
|---|---|---|---|---|
| 1 | Post-layout energy of a 1024 x 1024 wired ternary tile with shared sums, driven by real activation traces, in a 5nm-class flow | Invention 2's 0.1 pJ per weight-operation | At most 0.15 pJ including wiring and leakage | Above 0.5 pJ, wired silicon is only a speed play, as Taalas's cost figures suggest; drop to stored-weight ASICs |
| 2 | Hard-task share: run a frontier agentic and reasoning suite through 8 to 15B models with retrieval, then 60B models | The Amdahl section's 5% and 0.05% shares | Tier A solves at least 90%; fewer than 0.1% need more than Tier B | The two-tier fleet caps at ~20 to 50x; redesign Tier B larger |
| 3 | Inference-priced allocation law: cores of 0.5 to 3B with memory tiers 0 to 100x their size | Invention 1, and where Engram's U-curve moves when memory is priced at its inference cost | A 3B core plus memory matches a model with 3x its active compute on knowledge, within 2 points on math and code | Knowledge and reasoning do not separate; the core must grow, and the central case drifts toward the pessimistic one |
| 4 | Native ternary training at 3 to 8B with dReLU-style activation sparsity | Event-driven gain and the precision penalty | Within 1.5% loss of FP8 at equal compute, at least 70% zero activations, under 1.2x longer reasoning | Fall back to 2 to 3-bit wired weights at ~2x the gates |
| 5 | Freeze regret: freeze a 1 to 3B core, update only memory and adapters over 12 months of time-sliced data | Invention 3 | Under 1 point behind a retrained model at 12 months | Chip life shortens and NRE per token rises in proportion |
| 6 | Joule-priced RL on an open reasoning model, scored per solved task | Invention 5 | At least 2x fewer tokens per solved task at 1 point or less | Tokens per task becomes the pessimistic 1.5x inflation |
| 7 | Via-programmed fabric: foundry quote and a routing study for choosing 1 of ~40 sum wires per input with one via layer | The $3M NRE assumption | One-layer customization at under 2x area | NRE returns to ~$40M; dollars fall back to ~90x per task |

## What could kill it

The largest risk is quality: a ~12B ternary core may not reason at frontier level, however much memory sits beside it, and no experiment has tested that yet. The other risks are engineering and timing.

- **The baseline moves.** The cost of a fixed capability level falls ~10 to 13x a year on GPUs. A stack taped out in 2029 is measured against the 2029 frontier, so the 749x central case shrinks with every year of delay unless the core's quality keeps pace.
- **Wires, not gates.** Fully spatial designs are usually dominated by wire capacitance and leakage, which the gate counts here leave out. Taalas's ~2 pJ per parameter is the realistic reference until experiment 1 says otherwise.
- **Area and yield.** ~1.5 x 10^11 gates means several reticle-size dies or a wafer-scale part, with the packaging, yield and cooling risks that come with them.
- **Frozen flaws and oversight.** A reasoning flaw in silicon outlives its discovery, and latent reasoning weakens how readable the model's thinking is. Both need the safety valves built in above, not added later.
- **Workloads not modeled.** Multimodal input, very long single contexts and tool-heavy agents may shift the hard-task share and the per-user state budget.

## Prior art and sources

- [Engram: Conditional Memory via Scalable Lookup](https://arxiv.org/html/2601.07372v1), DeepSeek, January 2026: hashed lookup memory beside MoE, table offloaded to host DRAM.
- [Memory Layers at Scale](https://icml.cc/virtual/2025/poster/46172), Meta, ICML 2025: product-key memory layers at billion-entry scale.
- [Cartridges](https://arxiv.org/abs/2506.06266), Stanford, 2025, and [Cartridges++](https://arxiv.org/pdf/2609.35621), 2026: trained compact context caches.
- [Inference cost per token economics 2026](https://www.siliconreport.com/inference-cost-per-token-economics-2026-22d409d7), Silicon Report, citing SemiAnalysis InferenceX: the B2026 price.
- [arXiv 2607.26571](https://arxiv.org/pdf/2607.26571): H100 energy per HBM bit and per tensor-core operation.
- The companion report, *Path to 1000x cheaper LLM inference* (01-report-path-to-1000x.md): the Taalas HC1, BitNet, sparsity, tokens-per-task and Artificial Analysis figures used here.
- The synthesis scripts (Yosys 0.71), add-count model and cost model in /experiments.
