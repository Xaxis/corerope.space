# Sparse and Conditional Computation for LLM Inference Efficiency (MoE, activation sparsity, early exit, layer skipping, mixture-of-depths)

Research date: 2026-11-18. Older (pre-2025) results are marked [OLDER]. Some 2026 model specs come from secondary aggregators and are marked [SECONDARY].

## Q1. Highest total-to-active parameter ratios in frontier/near-frontier open models, and what MoE scaling laws say about optimal sparsity and efficiency leverage

### Takeaway
Frontier open-weight models in 2025-2026 converged on roughly 3-5% active parameters (about 20-33x total:active), with 256-900 fine-grained experts, 8-16 routed plus 0-1 shared experts per token. Ant Group's scaling laws put the matched-quality compute saving ("efficiency leverage") at about 7x for about 3% activation, and the saving grows with compute budget. So MoE is roughly a 7x lever on active FLOPs per token at equal quality, not 20-30x.

### Cited Findings
**Model specs (total / active / experts)**
- Kimi K2 Thinking (Moonshot, Nov 2025): 1T total, 32B active (3.2%); 61 layers (1 dense); 384 routed experts, 8 selected per token, plus 1 shared expert; expert hidden dim 2048, model hidden dim 7168; MLA attention; 256K context | [Hugging Face model card](https://huggingface.co/moonshotai/Kimi-K2-Thinking)
- Kimi K2.6 (Apr 2026): 1T total / 32B active, 256K context, Artificial Analysis Intelligence Index 54. MiMo V2.5 Pro (Xiaomi): 1T / 42B, 1M context, index 54. DeepSeek V4 Pro (Max Effort): 1.6T / 49B, 1M context, index 52. For comparison, proprietary GPT-5.5 (xhigh) scored 60 and Claude Opus 4.7 / Gemini 3.1 Pro scored 57. AA says these open models deliver comparable intelligence at "between half to one-sixth of the price" | [Artificial Analysis, Apr 30 2026](https://artificialanalysis.ai/articles/recent-open-weights-model-launches)
- DeepSeek V4-Pro: 1.6T total / 49B active (about 3.1%). V4-Flash: 284B / 13B (about 4.6%) | [aman.ai DeepSeek V4 primer](https://aman.ai/primers/ai/deepseek-v4/) (links primary arXiv 2606.19348)
- 2026 releases [SECONDARY, blog recap citing third-party timelines]:
  - Kimi K3 (late Jul 2026): reportedly 2.8T total, with 16 of 896 experts active per token (about 1.8% of the expert pool).
  - DeepSeek V4.1-Flash (Sep 10 2026): 552B total, "8B for input, 16B for output" active, described as a "causal encoder-decoder" MoE, with the KV cache claimed at 1/4 of the previous HBM footprint.
  - Gemma 4 26B A4B (Apr 2026): about 3.8B active of 26B (about 15%).
  - Aleph Alpha Kolibri (Oct 2026): 78B / about 3.5B.
  - Xiaomi MiMo-V2.6 Pro: 1.02T.
  - Source: [victorgrosser.nl recap Apr-Oct 2026](https://victorgrosser.nl/blog/open-weight-models-april-october-2026-recap/)
- gpt-oss-120b (OpenAI, Aug 2025): 116.8B total / 5.13B active (4.4%); 36 layers; 128 experts, top-4. gpt-oss-20b: 20.9B / 3.61B; 32 experts, top-4. Attention alternates 128-token banded window and dense layers, with GQA (64 Q heads, 8 KV heads) | [gpt-oss model card (arXiv 2508.10925)](https://arxiv.org/html/2508.10925v1)
- Qwen3-Next-80B-A3B (Sep 2025): 80B total / about 3B active (3.75%); 512 experts (up from 128 in Qwen3), 10 routed plus 1 shared active; hybrid attention with about 3:1 Gated DeltaNet to gated attention. Training cost was under 10% of Qwen3-32B's, on 15T tokens. Prefill and decode throughput was over 10x Qwen3-32B at 32K+ context. Base model beats Qwen3-32B on most benchmarks. AA index: 54 (reasoning) | [VentureBeat](https://venturebeat.com/ai/qwen3-next-debuts-with-impressively-efficient-performance-on-just-3b-active)
- Ling 2.0 (Ant Group, Oct 2025): Ling-mini-2.0 16B/1.4B, Ling-flash-2.0 103B/6.1B, Ling-1T 1000B/51B. Each uses 256 routed experts with 8 routed plus 1 shared active (about 3.5% activation). The team claims "up to 7x active-compute efficiency" versus dense. Ling-flash-2.0 "matches or surpasses dense models below 40B". Ling-1T is the largest open model trained entirely in FP8 (≤0.25% loss gap to BF16 after 900B tokens) | [Ling 2.0 paper, arXiv 2510.22115](https://arxiv.org/pdf/2510.22115)

**Scaling laws**
- Efficiency Leverage (EL) is defined as C_dense / C_MoE needed to reach equal loss. The study trained over 300 models up to 28B params.
  - Activation ratio: loss falls monotonically as activation ratio A falls (tested from 0.8% to 100%), and EL rises as A falls and as compute grows.
  - Granularity: loss is U-shaped in G = 2·d_model/d_expert, with the optimum around 8-12.
  - Shared experts have only "secondary influence".
  - The law predicts EL above 7x for A = 3.1%, G = 12 at 1e22 FLOPs.
  - Validation: Ling-mini-beta (0.85B active / 17.5B total, 1T tokens) matched or slightly beat a 6.1B dense model on the same 1T tokens, using "over 7x fewer computational resources".
  - Compute-optimal MoE models are smaller in active size and trained on more data than dense (MoE M_opt = 0.1915·C^0.5095 vs dense 0.0655·C^0.5422).
  - Source: [Ling Team, "Towards Greater Leverage", arXiv 2507.17702](https://arxiv.org/html/2507.17702v2)
- Joint MoE scaling laws (Ludziejewski et al., ICML 2025) model active params, data, and number of experts together, from 280+ experiments up to 2.7B active / 5B total. They claim "MoE models can be more memory-efficient than dense models", contradicting conventional wisdom. Only the abstract was retrieved, so the specific optimal-expert counts under a memory budget were not captured | [arXiv 2502.05172](https://arxiv.org/abs/2502.05172v1); [PMLR](https://proceedings.mlr.press/v267/ludziejewski25a.html)

### Inferences
- Total:active ratios at the frontier:
  - Kimi K2/K2.6 about 31x.
  - DeepSeek V4-Pro about 33x, V4-Flash about 22x.
  - gpt-oss-120b about 23x.
  - Qwen3-Next about 27x.
  - Ling-1T about 20x.
  - Kimi K3 is reportedly about 56x by expert-pool fraction (16/896), the most extreme reported, but unverified.
- The practical lever is EL (about 7x), not the raw ratio. Doubling sparsity yields diminishing EL gains: EL rises with lower A, but the curve is sublinear.
- EL grows with compute budget, so at frontier scale (1e25+ FLOPs) the realized EL may exceed 7x. No published law was found extrapolated and validated at that scale.
- Background (from prior knowledge, not re-verified this session):
  - DeepSeek V3/V3.2: 671B / 37B, 256 routed + 1 shared, top-8.
  - Llama 4 Maverick: about 400B / 17B; Scout: about 109B / 17B.
  - Qwen3-235B-A22B: 128 experts, top-8.
  - Kimi K2's tech report argued for a "sparsity 48" scaling law (384 experts / 8 active).
  - Treat these as needing verification.

### Gaps
- No primary DeepSeek V4 expert counts (routed/shared/top-k) were retrieved. The aman.ai primer did not include them.
- Kimi K3 parameters and expert counts are only from a secondary blog citing "reported" figures.
- No validated scaling-law estimate of EL at frontier compute (above 1e24 FLOPs) or at activation below 2%.
- The quantitative memory-constrained optimum from the Joint MoE Scaling Laws paper was not extracted (only the abstract was read).

## Q2. Does MoE's compute saving translate to real cost-per-token savings at serving time (memory-bandwidth-bound decode, expert parallelism)? Measured numbers.

### Takeaway
Yes, but only at large scale and high batch with expert parallelism. In SGLang's open reproduction, DeepSeek V3 (37B active / 671B total) serves at about $0.20 per 1M output tokens on H100s. That needed 96 GPUs, large-scale EP, PD disaggregation, load balancing (EPLB), and compute/communication overlap. Naive tensor-parallel serving is about 5x worse. At small batch, MoE decode is weight-bandwidth bound on total (not active) parameters touched, so the saving shrinks.

### Cited Findings
**SGLang DeepSeek V3 on 96 H100 (12 nodes × 8, InfiniBand, May 2025)** | source: [LMSYS blog, May 2025](https://lmsys.org/blog/2025-05-05-large-scale-ep/)
- Throughput: 52.3k input tok/s and 22.3k output tok/s per node at 2K inputs.
- Cost: about $0.20 per 1M output tokens, about 1/5 the DeepSeek Chat API price.
- Versus vanilla TP16: up to 5.2x decode and 3.3x prefill.
- Decode batch: 256 per device at 2K KV.
- Communication costs:
  - DeepEP dispatch takes about 0.17 ms per layer.
  - Two-batch overlap gives +27-35% prefill, but decode gains depend on batch: -27% at 32 tokens/device, +25.5% at 256 tokens/device.
  - EPLB load balancing gave 1.49x prefill and 2.54x decode speedups, showing that expert imbalance costs more than 2x if unmanaged.
  - SGLang's MoE kernels were about 25% slower than DeepSeek's internal ones.
- DeepSeek V4 versus V3.2 at 1M-token context: V4-Pro needs 27% of the single-token FLOPs and 10% of the KV cache. V4-Flash needs 10% of the FLOPs and 7% of the KV cache. This comes mainly from compressed/sparse attention (CSA/HCA), FP4, and KV management, not MoE alone | [aman.ai primer](https://aman.ai/primers/ai/deepseek-v4/)
- Qwen3-Next-80B-A3B (3B active) shows over 10x prefill/decode throughput versus dense Qwen3-32B at 32K+ context, combining MoE with linear-attention hybrid layers | [VentureBeat](https://venturebeat.com/ai/qwen3-next-debuts-with-impressively-efficient-performance-on-just-3b-active)
- gpt-oss-120b's 60.8 GiB checkpoint fits on a single 80GB GPU, thanks to MXFP4 on MoE weights (over 90% of params) | [gpt-oss model card](https://arxiv.org/html/2508.10925v1)
- Pricing: AA reports trillion-parameter open MoEs at half to one-sixth the price of comparable proprietary models | [Artificial Analysis](https://artificialanalysis.ai/articles/recent-open-weights-model-launches)
- Practitioner sources on MoE serving costs (titles only, not fetched): [Spheron, "MoE cost per token: why active parameters set your GPU bill"](https://www.spheron.network/blog/moe-cost-per-token-why-active-parameters-set-your-gpu-bill/); [tianpan.co, "MoE serving production quirks" (Apr 2026)](https://tianpan.co/blog/2026-04-10-mixture-of-experts-serving-production-quirks)

### Inferences
- Roofline arithmetic (my calculation, not sourced): each expert sees about B·k/E tokens per step. For an H100 to be compute-bound on BF16 weights needs about 300 FLOP/byte, i.e. about 150+ tokens per expert. For Kimi K2 (E=384, k=8), that means about 7,000+ concurrent tokens per EP group. Below that, decode cost scales with total weight bytes read, not active FLOPs.
- The DeepSeek/SGLang design (256 tokens/device × many devices) exists to reach that regime.
- Consequence for a 1000x design: MoE's roughly 7x EL is realizable mainly at hyperscale batch. A single-user or low-QPS deployment of a 1T MoE pays for all experts' memory and gets little speedup over dense. Memory capacity cost is 20-30x the active size; low-bit expert weights (Q4) partially offset this.
- Cost per token also depends heavily on attention/KV at long context. DeepSeek V4's 3.7-10x FLOP reduction at 1M tokens comes from attention, an orthogonal and compounding lever.
- The $0.20/M figure checks out: 8 H100 at about $2/hr each is $16/hr, and 22.3k tok/s × 3600 s is about 80M tok/hr, giving about $0.20/M.

### Gaps
- No apples-to-apples measured $/token for an MoE versus a quality-matched dense model on the same hardware and serving stack was found.
- No public 2026 SGLang/vLLM benchmark for DeepSeek V4 or Kimi K2.6 serving on GB200/B200 was retrieved. The LMSYS InferenceMAX/GB200 post (Oct 2025) was found but not fetched: [LMSYS](https://www.lmsys.org/blog/2025-10-14-sa-inference-max)
- Epoch AI analyses of MoE serving economics were not retrieved.

## Q3. Activation sparsity in dense models: achievable sparsity and realized speedups

### Takeaway
With modern SwiGLU models, training-free magnitude sparsity (TEAL) reaches 40-50%, for 1.5-1.8x single-batch decode speedup. ReLU-fication with continued pretraining (TurboSparse dReLU) reaches about 90% FFN sparsity with no quality loss, giving 2-5x on consumer GPU/CPU (up to 22x on mobile via offloading). These are small-batch/local-inference wins. They erode at large batch, because the union of active neurons across a batch approaches dense.

### Cited Findings
- TEAL (training-free, ICLR 2025): 40-50% model-wide activation sparsity on Llama-2/3 and Mistral (7B-70B), with "minimal" degradation. Wall-clock decode speedup is up to 1.53x at 40% and 1.8x at 50%. Compatible with weight quantization for added gains | [arXiv 2408.14690](https://arxiv.org/abs/2408.14690v2)
- TurboSparse (dReLU, 2024, [OLDER boundary]) | source: [arXiv 2406.05955](https://arxiv.org/html/2406.05955v2)
  - Sparsity: Mistral-7B reaches about 90% inactive FFN neurons, leaving 2.5B active of 7B. Mixtral-47B reaches about 85% inactive within experts, and combined with routing about 3% of params are active per MoE layer (4.3B active of 47B).
  - Cost: 150B tokens of continued pretraining.
  - Quality: OpenLLM average improved (Mistral 61.57 to 63.65; Mixtral 69.34 to 71.76), though some tasks dropped slightly (Hellaswag -1.2 to -1.4 points).
  - Speed: CPU/GPU hybrid gave 4.64x for Mistral-7B FP16 on a 2080Ti, and 3.35x for Mixtral-47B INT4. Mobile PowerInfer-2 ran Mixtral-47B INT4 at 11.1 versus 0.5 tok/s (22.2x).
  - ReLU-fication comparison: Llama-2-7B sparsity rose from 40% to 67% (ShiftedReLU 71%). At 90% top-k sparsity, dReLU perplexity was 29.19 versus 112.36 for SwiGLU.
  - The paper cites Deja Vu at about 2x and PowerInfer at up to 11x on a consumer GPU [OLDER].
- Note: activation sparsity stacks with MoE. TurboSparse-Mixtral shows sparsity inside experts on top of expert routing, at about 3% total active | [arXiv 2406.05955](https://arxiv.org/html/2406.05955v2)
- A 2026 follow-up, "SVD Contextual Sparsity Predictors for Fast LLM Inference" (arXiv 2603.14110), exists but could not be fetched | [arXiv PDF](https://arxiv.org/pdf/2603.14110)

### Inferences
- In a data-center setting with batched decode, activation sparsity gives roughly 1.0-1.5x at best. Datacenter results at batch over 32 were not found.
- Activation sparsity is most valuable as a compounding lever inside experts (MoE + dReLU), and for edge/offload inference where bandwidth to slow memory dominates.
- Frontier labs have not adopted ReLU-family activations in 2025-2026 flagship MoEs: Kimi K2 uses SwiGLU per its [model card](https://huggingface.co/moonshotai/Kimi-K2-Thinking). This suggests the quality/engineering trade-off has not been compelling at scale.

### Gaps
- No measured large-batch GPU serving speedups for activation sparsity were found.
- No 2026 frontier model uses activation sparsity as a headline feature (none found).
- ProSparse numbers were not retrieved.

## Q4. Mixture-of-depths, early exit, layer skipping, and adaptive per-token compute: realized gains and quality cost

### Takeaway
Gains here are small and shrinking. A 2026 study finds early-exit opportunity has fallen in newer, better-trained models: at an oracle 5-point MMLU tolerance, Llama3-8B can skip only 0.18% of layers, versus 4.69% for Llama2-7B. Mixture-of-depths showed isoFLOP training wins at at most 3B scale, but downstream and serving benefits are unproven. Its top-k routing is also non-causal at decode. These are at most low-single-digit percentage to about 1.5x levers in practice, far below MoE or quantization.

### Cited Findings
- "The Diminishing Returns of Early-Exit Decoding in Modern LLMs" (arXiv 2603.23701, Mar 2026) | source: [alphaXiv](https://www.alphaxiv.org/abs/2603.23701)
  - Oracle MMLU tests: Llama2-7B skips 4.69% of layers (accuracy 0.41 to 0.38); Llama3-8B skips 0.18% (0.54 to 0.52).
  - Improved pretraining recipes reduce layer redundancy. Larger models (over 20B) and base models show more potential. Dense transformers offer more early-exit potential than MoE and SSMs.
  - Reported as layer-skip proxies only, with no wall-clock speedups.
- Mixture-of-Depths (Raposo et al., Google DeepMind, 2024, [OLDER]) | source: [Graphcore Research summary, archived](https://web.archive.org/web/20251213050140/https://graphcore-research.github.io/mixture-of-depths/)
  - A 12.5%-capacity MoD (only 12.5% of tokens processed per routed block) reaches lower loss than isoFLOP-optimal baselines at 6e18-1e20 FLOPs (60M-3B params). Some variants are both cheaper per forward pass and better.
  - MoDE (MoD + MoE) beats vanilla MoE at equal FLOPs per forward pass.
  - Caveats: top-k routing is non-causal at sampling time, which needs an auxiliary loss or a separate predictor router. Downstream tasks were not evaluated.
- A 2026 adaptive layer-skipping paper, "LayerRoute: Adaptive Layer-Skipping with LoRA-Preserved Quality" (arXiv 2609.13682), was found but not fetched | [arXiv](https://arxiv.org/pdf/2609.13682)

### Inferences
- Early exit and layer skipping compound poorly with MoE (per the 2026 study) and with distillation: distilled and better-trained models have less redundancy.
- Batching is also a problem. Per-token variable depth causes ragged batches, and KV for skipped layers must still be filled or approximated.
- For the 1000x budget, budget at most about 1.2-1.5x from adaptive depth unless new evidence appears.
- Per-token adaptive compute in practice now appears more at the sequence level (reasoning effort settings, e.g. "Max Effort" vs low-effort modes per [Artificial Analysis](https://artificialanalysis.ai/articles/recent-open-weights-model-launches)) than at the layer level. This is an inference from naming, not a measured result.

### Gaps
- The often-quoted MoD claim of "up to 50% faster sampling steps" (from the original abstract, recalled) was not verified this session.
- No production frontier model deploying MoD or early exit was found.
- No wall-clock measurements for 2025-2026 layer-skipping methods were retrieved.

## Q5. How MoE interacts with quantization and distillation (does it compound?)

### Takeaway
MoE compounds well with low-bit weights. Routed experts, which are 90%+ of parameters, tolerate 4-bit (MXFP4/INT4/FP4) with QAT essentially losslessly, and this is now standard in frontier open models (gpt-oss, Kimi K2 Thinking, DeepSeek V4). Sub-3-bit expert quantization is possible but lossy without QAT. Low-bit experts directly attack MoE's main serving cost (memory capacity and bandwidth for total params). Quantization (about 4x versus BF16) and MoE EL (about 7x) multiply, for roughly 25-30x at small loss.

### Cited Findings
- gpt-oss: MoE weights were post-trained into MXFP4 at about 4.25 bits/param, covering over 90% of total params. This enables 120b (60.8 GiB) on one 80GB GPU and 20b (12.8 GiB) on 16GB systems. 120b surpasses o3-mini and approaches o4-mini | [arXiv 2508.10925](https://arxiv.org/html/2508.10925v1)
- Kimi K2 Thinking: INT4 weight-only QAT on MoE components in post-training, with all benchmarks reported at INT4. Moonshot claims a "lossless 2x speed-up in low-latency mode" | [Hugging Face](https://huggingface.co/moonshotai/Kimi-K2-Thinking)
- DeepSeek V4: FP4 quantization-aware training on routed expert parameters and on the lightning-indexer QK path | [aman.ai primer](https://aman.ai/primers/ai/deepseek-v4/)
- Ling 2.0 trains fully in FP8 with a ≤0.25% gap to BF16 | [arXiv 2510.22115](https://arxiv.org/pdf/2510.22115)
- Mixture Compressor (MC, 2024, [OLDER boundary]) on Mixtral 8x7B, post-training, no QAT | source: [arXiv 2410.06270](https://arxiv.org/html/2410.06270v2)
  - Accuracy (FP16 baseline 71.29): 2.54-bit mixed precision reaches 67.50 (95% retained); 2.05-bit reaches 63.25; 1.57-bit reaches 54.49; uniform 2-bit GPTQ reaches 42.67.
  - Memory: 96.8 GB to 16.2 GB. The result beats LLaMA2-13B (26 GB, 65.19) on accuracy at a smaller size.
  - Dynamic expert pruning cut activated params about 15% for under 1 point of loss.
  - Speedup: 1.6-2.1x.
  - Mixtral 8x22B: 281 GB to 46.6 GB at 2.54 bits (76.33 to 72.08).
- Earlier work, MoQE (Microsoft, NeurIPS 2023, [OLDER]), is titled "Complementary Effect of Low-bit Quantization and Robustness", arguing experts are robust to low-bit | [arXiv 2310.02410](https://arxiv.org/pdf/2310.02410). A NeurIPS 2026 poster targets "extremely low-bit quantization for MoE-LLMs" | [NeurIPS 2026](https://neurips.cc/virtual/2026/poster/153046). Neither was fetched; numbers unknown.
- Distillation plus sparsity (indirect evidence):
  - TurboSparse used 150B continued-pretraining tokens to convert dense to sparse with quality gains | [arXiv 2406.05955](https://arxiv.org/html/2406.05955v2)
  - Qwen3-Next reached quality above Qwen3-32B at under 10% of the training cost | [VentureBeat](https://venturebeat.com/ai/qwen3-next-debuts-with-impressively-efficient-performance-on-just-3b-active)

### Inferences
Rough compounding stack for the 1000x project, relative to a frontier dense BF16 transformer at equal quality (my estimates, multiplicative only where the levers attack different bottlenecks):

| Lever | Multiplier | Status |
|---|---|---|
| MoE at about 3% activation | about 7x active FLOPs (EL) | Measured in scaling laws |
| 4-bit expert weights (QAT) | about 3.5-4x bytes; about 2x measured latency (Kimi) | Measured |
| Sparse/compressed attention at long context | about 4-10x FLOPs at 1M tokens (DeepSeek V4 vs V3.2) | Measured by vendor |
| Activation sparsity within experts | about 1.5-2x at small batch, about 1x at large batch | |
| Adaptive depth / early exit | about 1.0-1.3x | |

- The product is about 50-100x on compute and bandwidth at long context, before distillation, hardware, or speculative decoding.
- This is consistent with AA's observation that open MoEs run 2-6x cheaper than comparable proprietary models, and with SGLang's $0.20/M tokens for a 37B-active model.
- Compounding caveat: low-bit and MoE both reduce bytes per token, but MoE's batching requirement (many tokens per expert) is independent of bit-width. Low-bit helps the memory-capacity problem more than it removes the batching problem.
- Distillation compounds by letting a smaller-active MoE match a larger teacher. Direct quantified evidence on distilling into high-sparsity MoE students was not found.

### Gaps
- No controlled study quantifying how far MoE expert weights can drop (e.g. 2-bit QAT) at frontier scale with less than 1% loss was retrieved. The NeurIPS 2026 low-bit MoE paper was not read.
- No measured end-to-end $/token for FP4 MoE on Blackwell versus BF16 dense was found.
- No source directly measured MoE + distillation interaction (e.g. a dense teacher to a sparse student at matched quality).
- Epoch AI analyses on MoE inference economics were not retrieved.
