# Attention Alternatives and KV-Cache Efficiency for LLM Inference (state as of Nov 2026)

Notation: "[older]" marks pre-2025 results. "[not re-fetched]" marks well-known paper claims cited from the paper's abstract/arXiv record that were not re-opened during this research session (verify before quoting exact figures). Per the user's style, no em dashes are used.

## 1. Measured throughput, memory and cost improvements of hybrid / linear / sparse models vs full attention at 8K, 32K, 128K, 1M

### Takeaway
Measured attention-side gains are small at short context and grow with length: roughly 1.5-4x at 4-8K, ~3-10x at 32K-128K, and 6-10x (throughput) or 10-50x (KV memory) at 1M. The strongest 2026 data point is DeepSeek-V4 (Apr 2026): at 1M context, V4-Flash uses ~10% of V3.2's per-token FLOPs and ~7% of its KV cache, and roughly 2% of the KV cache of a bf16 GQA-8 baseline.

### Cited Findings

**Hybrid linear attention (Gated DeltaNet / KDA / Lightning) + full attention**
- Qwen3-Next-80B-A3B (Sep 2025): 3:1 Gated DeltaNet to gated full attention (75% linear). Versus Qwen3-32B, prefill throughput is ~7x at 4K and >10x beyond 32K; decode is ~4x at 4K and >10x beyond 32K. Note this compares an 80B-A3B MoE hybrid with a 32B dense model, so the MoE and attention gains are mixed together. Training cost is <10% of Qwen3-32B's GPU hours (9.3%), on 15T tokens. Native context is 262,144 tokens, validated to 1M with YaRN (factor 4). [Alibaba Cloud / Qwen blog](https://www.alibabacloud.com/blog/qwen3-next-towards-ultimate-training-%26-inference-efficiency_602580)
- Kimi Linear (Moonshot, Oct 30 2025): 48B total / 3B active. 3:1 Kimi Delta Attention (KDA) to MLA, trained on 1.4T tokens for the comparison. KV cache use is cut by "up to 75%". Decoding throughput is "up to 6x" at 1M context. TPOT at 1M is 1.84 ms vs 11.48 ms for full MLA (~6.2x), attributed to larger batches from the cache savings. At batch size 1 and 1M context, the decode speedup is only 2.3x over MLA. [Kimi Linear paper (alphaXiv 2510.26692)](https://alphaxiv.org/abs/2510.26692)
- Ling 2.5 1T / Ring 2.5 1T (early 2026): a Lightning Attention (linear) + MLA hybrid, claimed ~3.5x the throughput of Kimi K2 at 32K tokens (vendor claim). [Raschka, "A Dream of Spring for Open-Weight LLMs" (Jan-Feb 2026 architectures)](https://magazine.sebastianraschka.com/p/a-dream-of-spring-for-open-weight)
- Qwen3.5 (early 2026; 397B-A17B, 122B-A10B, 35B-A3B, 27B) and Qwen3-Coder-Next (80B-A3B, 3:1 GDN:attention, 262K native) carry the Gated DeltaNet hybrid into Qwen's flagship line. [Raschka](https://magazine.sebastianraschka.com/p/a-dream-of-spring-for-open-weight)
- Qwen3.6-27B (2026): 64 layers, of which 16 are gated full-attention layers (4 KV heads, head_dim 256) and the rest Gated DeltaNet. Its KV cache is ~17.2 GB at 262,144 tokens in BF16 (≈64 KiB/token, derived), against ~54 GB of weights. [Kaitchup](https://kaitchup.substack.com/p/qwen36-27b-kv-cache-quantization)

**Hybrid Mamba-2 + attention (NVIDIA, AI21, TII)**
- Nemotron-H (Apr 2025): only ~8% of layers are self-attention (8B: 4 of 52 layers; 56B: 10 of 118), with the rest Mamba-2 and FFN. Measured at 65,536 input / 1,024 output tokens on H100, in output tok/s/GPU:
  - 56B vs Qwen-2.5-72B and Llama-3.1-70B: 2.4x.
  - 47B (compressed) vs the same models: 2.9x.
  - 56B vs Llama-3.1-405B: 19.6x.
  - 8B vs Llama-3.1-8B: 3x.
  - The 56B beats Llama-3.1-70B on 16 of 17 tasks.
  - FP8 pretraining stays within 0.1% loss of BF16.
  - [Nemotron-H paper (arXiv 2504.03624)](https://arxiv.org/abs/2504.03624v4)
- Nemotron 3 Nano (Dec 2025): a hybrid Mamba-2 + GQA MoE, 31.6B total / ~3.6B active, 6 of 128 experts routed per token, 1M context. At 8K input / 16K output on a single H200, it shows 3.3x the throughput of Qwen3-30B-A3B and 2.2x of GPT-OSS-20B. It is up to 4x faster than Nemotron Nano 2. [HF/NVIDIA blog](https://huggingface.co/blog/nvidia/nemotron-3-nano-efficient-open-intelligent-models); [Nemotron 3 paper (arXiv 2512.20856)](https://arxiv.org/html/2512.20856v1)
- Jamba (AI21, 2024) [older] [not re-fetched]: a 1:7 attention:Mamba interleave with MoE and 256K context. It reports a KV cache of ~4 GB at 256K, versus ~32 GB for Mixtral and ~128 GB for Llama-2-70B, and ~3x Mixtral's throughput at long context. [Jamba paper (arXiv 2403.19887)](https://arxiv.org/abs/2403.19887)

**Pure SSM microbenchmark (Mamba-3, ICLR 2026)**
- 1.5B models, H100, batch 128, prefill+decode wall time:
  - n=4096: 58.6 s for Llama-3.2-1B on vLLM, vs 36.4 s for GDN, 37.2 s for Mamba-2 and 35.1 s for Mamba-3 SISO.
  - n=16384: 976.5 s for Llama on vLLM, vs 145.9 s for GDN, 149.0 s for Mamba-2 and 140.6 s for Mamba-3 SISO (~6.9x).
  - Prefill-only, vLLM Llama is faster at every length (12.2 s vs 16.2 s at 16K), so linear models win only once decode dominates.
  - Mamba-3 MIMO (r=4) adds >1 point of accuracy at 1B with no decode-latency cost.
  - [Together AI Mamba-3 blog](https://together.ai/blog/mamba-3); [Mamba-3 paper (arXiv 2603.15569)](https://arxiv.org/html/2603.15569); [ICLR 2026 oral](https://iclr.cc/virtual/2026/oral/10010353)

**Sparse / compressed attention (DeepSeek line, GLM, StepFun)**
- DeepSeek-V3.2-Exp (Sep 29-30 2025) adds DeepSeek Sparse Attention (DSA, a lightning indexer plus top-k token selection) on top of MLA. Per DeepSeek's report, at 128K context prefill costs ~3.5x less and decoding ~6-7x less than V3.1-Terminus. [The Decoder](https://the-decoder.com/deepseek-slashes-api-prices-by-up-to-75-percent-with-its-latest-v3-2-model/); [DeepLearning.AI The Batch](https://www.deeplearning.ai/the-batch/deepseek-v3-2-exp-streamlines-processing-using-a-lightning-indexer-boosting-efficiency)
- DeepSeek-V4 (Apr 24 2026): V4-Pro is 1.6T total / 49B active, V4-Flash is 284B / 13B active, both with 1M context and MIT license. Attention has three parts:
  - CSA (4x sequence compression of KV plus lightning-indexer top-k over the compressed blocks).
  - HCA (128x compression with dense attention over the compressed blocks).
  - A sliding-window branch for recent tokens.

  Efficiency at 1M context vs V3.2:
  - V4-Pro: ~27% of single-token inference FLOPs and ~10% of KV memory.
  - V4-Flash: ~10% of FLOPs and ~7% of KV.
  - Both: ~2% of the KV of a bf16 GQA-8 baseline.

  Other details:
  - KV is stored in FP8 (BF16 only for the RoPE dims), the indexer runs in FP4, and the instruct models use FP4 MoE experts.
  - MRCR 8-needle: >0.82 through 256K and 0.59 at 1M.
  - SWE-Verified: 80.6.
  - [HF DeepSeek-V4 blog](https://huggingface.co/blog/deepseekv4); [vLLM DeepSeek-V4 blog](https://vllm.ai/blog/2026-04-24-deepseek-v4)
- GLM-5 (early 2026; 744B / 40B active) uses MLA + DSA and cut layer count from 92 to 78 to lower inference cost and latency. [Raschka](https://magazine.sebastianraschka.com/p/a-dream-of-spring-for-open-weight)
- Step 3.5 Flash (196B / 11B active; sliding window + gated attention + MTP-3) claims ~100 tok/s at 128K vs ~33 tok/s for DeepSeek-V3.2 on Hopper (vendor figure). [Raschka](https://magazine.sebastianraschka.com/p/a-dream-of-spring-for-open-weight)
- Arcee Trinity Large (400B / 13B active) uses sliding-window (4096) : global = 3:1, with NoPE in the global layers. [Raschka](https://magazine.sebastianraschka.com/p/a-dream-of-spring-for-open-weight)

**MLA / GQA**
- MLA (DeepSeek-V2, 2024) [older] [not re-fetched]: KV cache reduced 93.3% and max generation throughput 5.76x versus DeepSeek 67B (MHA). [DeepSeek-V2 paper (arXiv 2405.04434)](https://arxiv.org/abs/2405.04434)

### Inferences
- Per-token KV footprint, BF16, derived from public configs (my arithmetic, not from a single source):
  - Llama-3.1-70B (GQA-8, 80 layers): ≈320 KB/token.
  - DeepSeek-V3/V3.2 MLA (576-dim latent, 61 layers): ≈70 KB/token, ~4.5x smaller.
  - Qwen3.6-27B hybrid: ≈64 KiB/token.
  - DeepSeek-V4: ~2% of a GQA-8 bf16 baseline, which is ~50x smaller.
  - At 1M tokens a 70B GQA model would need ~320 GB of KV per sequence. V4-class designs need a few GB.
- Most headline "6x-10x" throughput numbers are batch-throughput gains that come from fitting more sequences in HBM. Batch-1 latency gains are smaller (Kimi Linear: 2.3x at 1M). For cost per token, batch throughput is the right metric.
- Attention-side savings at 8K are modest (Qwen3-Next decode ~4x at 4K, but that includes MoE vs dense). The large multipliers apply mainly at ≥32K, which matters because agentic contexts sit around 70-160K (see Q3).

### Gaps
- No vendor-neutral, apples-to-apples (same params, same data) throughput table at 8K / 32K / 128K / 1M for hybrid vs dense was found. Most comparisons confound MoE, model size and attention.
- No measured numbers yet for Nemotron 3 Super/Ultra, Falcon-H1/H1R, MiniMax-Text-01 or Jamba 1.7 serving were collected this session.
- DeepSeek-V4 pricing was not found in the sources read.
- RWKV-7 and RetNet: no 2025-2026 frontier-scale serving data found. They appear not to be used in any top open-weight model as of Nov 2026, but this is not confirmed.

## 2. Capability gaps of pure linear/SSM models and how hybrids fix them; required attention ratio

### Takeaway
Pure fixed-state models remain weaker at associative recall, copying and in-context retrieval. The consensus fix is about 1 full (or MLA) attention layer per 3-7 linear layers. Hybrids at 3:1 now match or beat full attention on RULER at 64-128K. The main residual risk is multi-hop reasoning and agentic degradation that only appears at scale (MiniMax's experience).

### Cited Findings
- Systematic study (Jul 2025): 72 models (340M/20B tokens and 1.3B/100B tokens), 6 linear variants and 5 ratios.
  - Language modeling is stable across ratios.
  - Recall improves as full-attention layers are added, with the biggest gains below a 3:1 ratio.
  - The authors recommend HGRN-2 or Gated DeltaNet at 3:1 to 6:1 linear:full for Transformer-level recall.
  - Selective gating, hierarchical recurrence and controlled forgetting are critical.
  - Strong standalone linear models are not necessarily strong in hybrids.
  - [arXiv 2507.06457](https://arxiv.org/abs/2507.06457)
- Qwen3-Next ablation: Gated DeltaNet showed stronger in-context learning than sliding-window attention or Mamba-2. A 3:1 hybrid beat any single architecture. "Linear attention alone is fast but weak at recall." [Qwen blog](https://www.alibabacloud.com/blog/qwen3-next-towards-ultimate-training-%26-inference-efficiency_602580)
- Mamba-3 authors (2026): fixed-state linear models underperform Transformers on retrieval, and among pure models the Transformer is strongest. Hybrids outperform pure models and give better retrieval than a vanilla Transformer. They predict linear layers will "predominantly be used in conjunction with global self-attention layers." [Together AI](https://together.ai/blog/mamba-3)
- Kimi Linear at 3:1 KDA:MLA, RULER@128K: 84.3 vs 81.3 for full MLA. It wins 6 of 8 long-context benchmarks but loses LongBench V2 (35.0 vs 36.1) and Frames (58.8 vs 60.5). [Kimi Linear](https://alphaxiv.org/abs/2510.26692)
- Olmo Hybrid 7B (AI2, Mar 5 2026): 3:1 Gated DeltaNet:MHA on 6T tokens.
  - On RULER it trails Olmo 3 slightly at 4K, overtakes at 8K, and the gap widens: 85.0 (DRoPE) vs 70.9 at 64K.
  - It reaches Olmo 3's MMLU with 49% fewer tokens (~2x data efficiency).
  - The projected token-savings factor rises from ~1.3x at 1B to ~1.9x at 70B, though the authors say this is not statistically conclusive.
  - [AI2 Olmo Hybrid](https://allenai.org/blog/olmohybrid)
- Nemotron-H keeps only ~8% attention layers (≈1:12) and reports parity or better against Llama/Qwen at 8B-56B. [arXiv 2504.03624](https://arxiv.org/abs/2504.03624v4)
- MiniMax M2 (Oct-Nov 2025) abandoned MiniMax-01's Lightning-attention hybrid and went back to full attention.
  - At small scale the hybrid matched full attention on MMLU, BBH, MATH and LongBench. At larger scale it had "clear deficits in complex, multi-hop reasoning tasks."
  - An SWA hybrid "degraded noticeably as context length grew," which they judged unacceptable for agents.
  - Retrieval and induction heads form early in pretraining and are hard to fix afterward.
  - Linear attention is more precision-sensitive, and prefix caching and speculative decoding were immature for it.
  - They put the theoretical compute crossover at only a few thousand tokens.
  - MiniMax M2.5 (2026) is still plain GQA.
  - [MiniMax blog](https://www.minimax.io/news/why-did-m2-end-up-as-a-full-attention-model); [Raschka](https://magazine.sebastianraschka.com/p/a-dream-of-spring-for-open-weight)
- [older] [not re-fetched] Zoology (Dec 2023) attributes most of the perplexity gap between gated-convolution models and attention to associative recall. [arXiv 2312.04927](https://arxiv.org/abs/2312.04927). "Repeat After Me" (Feb 2024) shows that Transformers can copy long strings that fixed-state SSMs provably cannot, because of state size. [arXiv 2402.01032](https://arxiv.org/abs/2402.01032)

### Inferences
- The field converged on roughly a 3:1 linear:full ratio, which puts an upper bound of ~4x on KV-cache reduction from hybridization alone. Nemotron-style ~1:12 gives ~12x. Any larger KV cut has to come from compressing or sparsifying the remaining attention layers (MLA, DSA, CSA/HCA) and quantizing them. That is exactly the stack DeepSeek-V4 and Kimi Linear (KDA + MLA) use.
- There are two industry camps as of late 2026:
  - Hybrid linear: Qwen3-Next/3.5/3.6, Kimi Linear, Ling 2.5, Nemotron 3, Olmo Hybrid.
  - Full-but-compressed/sparse attention: DeepSeek V3.2/V4, GLM-5, Kimi K2.5 MLA, MiniMax M2.x plain GQA.

  MiniMax's negative result is the main published caution that small-scale parity may not hold for frontier multi-hop and agentic work.

### Gaps
- No public frontier-scale (>200B active-equivalent) controlled ablation of hybrid vs full attention on agentic benchmarks was found.
- How retrieval-heavy agentic tasks (e.g., SWE-bench over 100K+ token repos) behave in 3:1 hybrids vs DSA models has not been head-to-head benchmarked in the sources found.

## 3. KV-cache share of inference cost in realistic 2026 workloads (long reasoning, agents)

### Takeaway
Agentic workloads are decode-dominated (91-98.6% of LLM time) with accumulated contexts of ~70-80K mean and ~150-166K max. They depend on long-lived, highly reusable KV (84-99.5% prefix hit rates). KV capacity therefore sets batch size, and thus cost, and hit rates collapse when memory is oversubscribed.

### Cited Findings
- "Agentic AI Workload Characteristics" (arXiv 2605.26297, v2 Sep 21 2026) studied ADE, SWE-bench Pro, DABStep, GAIA and Terminal-Bench 2.0 with Gemma and Qwen3.6-27B.
  - Decode takes 91.0-98.6% of LLM time and prefill 1.4-9.0%.
  - Prefix-cache hit rates are 84.6-99.5% (theoretical 87.9-99.3%).
  - SWE-bench Pro contexts average 68.7-80.1K tokens, with maxima of 146-166K.
  - Qwen3.6-27B on Terminal-Bench 2.0: the hit rate falls from 98.85% at concurrency 15 to 16.78% at concurrency 20 (thrashing). Per-request generation drops from 30.1 to 17.0 to 10.3 tok/s as concurrency rises.
  - Agents averaged up to 108.8 turns per task.
  - [alphaXiv 2605.26297](https://www.alphaxiv.org/abs/2605.26297)
- vLLM (Apr 2026): FP8 KV lowers the memory-bound decode ITL slope to 54% of BF16 (Llama-3.1-8B, H100), with break-even at ~7K tokens. Below ~7K the fixed overheads dominate, which is evidence that KV reads are the dominant per-token decode cost only beyond several thousand tokens. [vLLM FP8 KV blog](https://vllm.ai/blog/2026-04-22-fp8-kvcache)
- DeepSeek-V4's Think Max mode requires ≥384K context, which shows that frontier reasoning traces now routinely consume hundreds of thousands of tokens. [HF DeepSeek-V4](https://huggingface.co/blog/deepseekv4)
- Qwen3.6-27B, a hybrid model, still needs ~17.2 GB of KV at 262K tokens vs ~54 GB of weights. One long sequence uses about a third of the weight footprint even after a 4x hybrid reduction. [Kaitchup](https://kaitchup.substack.com/p/qwen36-27b-kv-cache-quantization)

### Inferences
- For a dense GQA model at ~80K tokens (320 KB/token × 80K ≈ 26 GB per sequence for a 70B), KV bytes read per decode step exceed the weights' bytes once batch size exceeds a few sequences. In agentic workloads KV is plausibly the majority of HBM traffic and capacity. This is a calculated estimate; no source gives a measured "% of cost".
- Because decode dominates and prefixes are reused, the levers that matter most for agents are KV bytes per token (capacity → batch → $/token) and per-step KV read volume (sparse/compressed attention). Prefill FLOP reduction matters less.

### Gaps
- No published measurement was found that gives KV-cache reads as an explicit share of $ or GPU-seconds for frontier production traffic in 2026.

## 4. MLA and DeepSeek V3.2 sparse attention: cost-reduction claims and measured API price changes

### Takeaway
DSA delivered a claimed 3.5x (prefill) and 6-7x (decode) cost reduction at 128K, with benchmark parity, and DeepSeek passed it through as 50-75% API price cuts. V4 then went further to ~10-27% of V3.2's FLOPs and 7-10% of its KV at 1M.

### Cited Findings
- V3.2-Exp API prices (Sep 29 2025), per 1M tokens:
  - Input, cache hit: $0.07 → $0.028 (-60%).
  - Input, cache miss: $0.56 → $0.28 (-50%).
  - Output: $1.68 → $0.42 (-75%).
  - [The Decoder](https://the-decoder.com/deepseek-slashes-api-prices-by-up-to-75-percent-with-its-latest-v3-2-model/); [VentureBeat](https://venturebeat.com/technology/deepseeks-new-v3-2-exp-model-cuts-api-pricing-in-half-to-less-than-3-cents)
- Quality, V3.1-Terminus → V3.2-Exp:
  - MMLU-Pro: 85.0 → 85.0.
  - GPQA-D: 80.7 → 79.9.
  - HLE: 21.7 → 19.8.
  - AIME25: 88.4 → 89.3.
  - Codeforces: 2046 → 2121.
  - BrowseComp: 38.5 → 40.1.
  - SWE-Verified: 68.4 → 67.8.

  DeepSeek attributes the small deltas to shorter responses. [The Decoder](https://the-decoder.com/deepseek-slashes-api-prices-by-up-to-75-percent-with-its-latest-v3-2-model/)
- MLA [older] [not re-fetched]: 93.3% KV reduction and 5.76x throughput (DeepSeek-V2). [arXiv 2405.04434](https://arxiv.org/abs/2405.04434)
- MLA + DSA adoption by others: GLM-5. MLA alone: Kimi K2/K2.5, Sarvam 105B. [Raschka](https://magazine.sebastianraschka.com/p/a-dream-of-spring-for-open-weight)
- DeepSeek-V4 at 1M context: V4-Pro uses 27% of V3.2's FLOPs and 10% of its KV. V4-Flash uses 10% FLOPs and 7% KV. [HF](https://huggingface.co/blog/deepseekv4)

### Inferences
- Compounded from DeepSeek-V2 (MHA→MLA, ~14x smaller KV) through V3.2 (DSA, 6-7x cheaper decode at 128K) to V4 (a further ~10x smaller KV and 4-10x fewer FLOPs at 1M), DeepSeek's long-context attention cost per token has fallen by roughly two orders of magnitude versus a 2023-style MHA design. The individual factors are measured at different context lengths, so the product is indicative only.
- The 75% output price cut is larger than the 50% input cut, consistent with decode at long context being the KV-bound regime DSA targets.

### Gaps
- V4 API pricing, and whether the V3.2-to-V4 compute savings were passed through to prices, were not found.
- No independent (non-DeepSeek) measurement of DSA's 6-7x decode-cost claim was found.

## 5. Do these gains overlap with or stack on top of quantization and MoE?

### Takeaway
They mostly stack, because they hit different terms. MoE cuts weight FLOPs and bytes per token. Hybrid, sparse and compressed attention cut KV bytes and attention FLOPs. KV quantization (FP8 ~2x, FP4 ~4x) multiplies on top of any KV structure. The catch is Amdahl's law: once KV drops ~50x, weights and expert reads dominate again, and attention-side levers stop helping at short context (<~7K).

### Cited Findings
- DeepSeek-V4 stacks all of them: MoE (13-49B active of 284B-1.6T), compressed + sparse attention, FP8 KV, an FP4 indexer and FP4 experts. Net KV is ~2% of a bf16 GQA-8 model. [HF](https://huggingface.co/blog/deepseekv4)
- Nemotron 3 Nano stacks a Mamba-2 hybrid with MoE (3.6B of 31.6B active) for 3.3x Qwen3-30B-A3B's throughput, a comparison with an MoE that has nearly the same active parameters. This isolates roughly the attention/hybrid contribution at 8K in / 16K out. [HF/NVIDIA](https://huggingface.co/blog/nvidia/nemotron-3-nano-efficient-open-intelligent-models)
- FP8 KV in vLLM (Apr 2026):
  - Memory per token is halved, and the decode ITL slope falls to 54% of BF16 (Llama-3.1-8B).
  - At concurrency 8 with 20K in / 2K out, throughput rises 14.9%.
  - Accuracy:
    - 128K NIAH: 89% vs 91% for BF16, after an accumulation fix (13% before the fix).
    - Reasoning: ≤0.7-2 points lost (Qwen3.5-27B, Qwen3-30B-A3B-Thinking).
    - MRCR AUC recovery: 93-98%.
  - Gains shrink on sliding-window hybrids (gpt-oss-20b: 80% slope, +4.8% throughput), and the advice is to skip FP8 on SW layers.
  - Kimi-K2.5 MLA shows a small but consistent negative drift without calibration.
  - [vLLM](https://vllm.ai/blog/2026-04-22-fp8-kvcache)
- MiniMax: linear attention is more sensitive to numerical precision, which complicates low-precision state storage. This is a possible anti-synergy between linear layers and aggressive quantization. [MiniMax](https://www.minimax.io/news/why-did-m2-end-up-as-a-full-attention-model)
- Nemotron-H: FP8 pretraining is within 0.1% loss of BF16, and the 56B in FP4 fits in ~29.5 GiB, so hybrid Mamba is compatible with low-precision weights. [arXiv 2504.03624](https://arxiv.org/abs/2504.03624v4)
- Qwen3-Next combines a 3:1 GDN hybrid, ultra-sparse MoE (512 experts, 10+1 active, 3.7% active) and native MTP for speculative decoding. [Qwen blog](https://www.alibabacloud.com/blog/qwen3-next-towards-ultimate-training-%26-inference-efficiency_602580)

### Inferences
- A rough multiplier budget for attention/KV at ≥128K context, relative to a bf16 GQA dense baseline:
  - Hybrid 3:1 or MLA: ~4-5x.
  - Sparse/compressed attention (DSA/CSA/HCA): a further ~5-10x.
  - FP8 → FP4 KV: 2-4x.
  - Combined: ~40-200x on KV bytes. DeepSeek-V4's measured ~50x vs GQA-8 bf16 lies in this band.

  This multiplies with MoE's weight-side savings (e.g., 3-5% active parameters) but does not multiply with them for the same term. Total cost-per-token gains are bounded by whichever term (weights, KV, or overhead) dominates after the cuts.
- Overlaps:
  - Hybrid and sparse attention both target the same KV and attention term, so they overlap partly.
  - Prefix caching interacts with linear layers, because recurrent state cannot be sliced at arbitrary prefixes the way a paged KV cache can (MiniMax lists it as an open problem). That matters because agents get 85-99% prefix-hit rates.
  - Speculative decoding (MTP) stacks with everything, but is harder with recurrent state rollback.
- For a ~1000x target: attention/KV levers plausibly supply 10-50x at long context but only ~1-2x at short context. The rest must come from MoE sparsity, weight quantization, speculative decoding, hardware and distillation.

### Gaps
- No controlled study was found that measures the joint (multiplicative vs sub-multiplicative) effect of hybrid attention + KV FP4 + MoE on end-to-end $/token.
- Token eviction methods (H2O, SnapKV and successors) and cross-layer KV sharing (CLA, YOCO) were not researched in depth this session. No 2025-2026 production deployment data was collected for them.
- NVFP4 KV-cache accuracy data was not retrieved. The vLLM post explicitly excludes it, and a Spheron blog claims a gain in concurrent requests but was not fetched.
