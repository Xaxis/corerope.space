# Low-bit numerics for LLM inference efficiency (quantization, QAT vs PTQ, pruning/N:M sparsity), state as of Nov 2026

Scope note: research done 2026-11-18. Dates are marked per finding. "Older" means pre-2025. Vendor claims are flagged as such. Several primary sources (BitNet b1.58 2B4T arXiv paper and HF model card) could not be fetched in this session (URL allowlist block), so some well-known 2B4T headline numbers appear only in Gaps.

## Q1. Largest natively low-bit models trained to date, and quality vs full precision at equal params / equal compute; scaling-law evidence

### Takeaway
The largest publicly documented native 4-bit pretraining run is NVIDIA's 12B hybrid Mamba-Transformer on 10T tokens in NVFP4 (Sept 2025), which lands within ~1-1.5% relative loss of FP8 and near-parity on most benchmarks. For ternary, Microsoft's largest official from-scratch model is still BitNet b1.58 2B4T (Apr 2025); the 2026 frontier of ternary is larger but mostly built from full-precision bases (Bonsai 2 27B at 1.76 bpw, 98.2% retention vs Qwen3.8 27B; Maple-Preview 20B-A1B ternary MoE; CAT-Q PTQ ternary up to 235B), so clean equal-compute evidence at frontier scale does not exist. Scaling-law work (Kumar et al., ICLR 2025) predicts compute-optimal precision of ~7-8 bits and says going below ~4 bits needs >4x more params for equal loss; empirical 2025-2026 results at 4 bits are more favorable than that prediction, while sub-2-bit at frontier scale remains unproven.

### Cited Findings
**Native FP4 (NVFP4/MXFP4) pretraining (2025)**
- 12B-parameter hybrid Mamba-Transformer (62 blocks) trained on 10T tokens in NVFP4; described as "the longest publicly documented training run in 4-bit precision to date"; FP8 baseline trained on identical setup. [NVIDIA, Pretraining LLMs with NVFP4, arXiv 2509.25149](https://arxiv.org/html/2509.25149v2)
- Relative validation-loss error vs FP8 stays below 1% during the stable LR phase, widening to slightly above 1.5% during LR decay; switching to BF16 after 8.2T tokens closes the gap to ~0.5% with only ~6% of total compute in higher precision. [arXiv 2509.25149](https://arxiv.org/html/2509.25149v2)
- Downstream FP8 vs NVFP4 (12B/10T): MMLU-Pro 5-shot 62.62 vs 62.58; MMLU 77.36 vs 76.57; GSM8K CoT 89.08 vs 92.27; MATH 83.32 vs 81.48; code avg 59.52 vs 56.67 (largest gap); Winogrande 80.58 vs 78.77. [arXiv 2509.25149](https://arxiv.org/html/2509.25149v2)
- Recipe: first two and last eight blocks kept in BF16 (~16% of linear layers); general recommendation "fewer than 15%" of linear layers in BF16/MXFP8, mostly at the end; 16x16 Random Hadamard transforms on Wgrad inputs only; 2D 16x16 weight scaling, 1x16 for activations/gradients; stochastic rounding on gradients, round-to-nearest-even for weights/activations. [arXiv 2509.25149](https://arxiv.org/html/2509.25149v2)
- NVFP4 vs MXFP4 (8B model, 1T tokens): MXFP4 ~2.5% relative loss error vs ~1.5% for NVFP4; MXFP4 needed ~36% more tokens (1.36T vs 1T) to match NVFP4 loss. [arXiv 2509.25149](https://arxiv.org/html/2509.25149v2); same 36% figure repeated in [NVIDIA Research blog, June 2026](https://research.nvidia.com/labs/eai/blogs/pushing-intelligence-to-4-bit/)
- Frontier production use of FP4 QAT (2026): DeepSeek-V4 (1.6T MoE) applies FP4 QAT to expert weights and the sparse-attention indexer, FP8 elsewhere; GPT-OSS uses MXFP4 QAT for MoE experts (>90% of params), letting the 120B model run on one 80 GB GPU. [NVIDIA Research blog, June 29 2026](https://research.nvidia.com/labs/eai/blogs/pushing-intelligence-to-4-bit/)

**Ternary / 1.58-bit models (2024-2026)**
- BitNet b1.58 2B4T (Microsoft, released 04/14/2025): 2.4B params, trained from scratch on 4T tokens; still the only official Microsoft generative BitNet LLM listed; 2026 official additions are embedding models only (BitNet-embedding-0.6B and -270M, 07/20/2026). Community-supported ternary models in bitnet.cpp: bitnet_b1_58-large 0.7B, bitnet_b1_58-3B 3.3B, Llama3-8B-1.58-100B-tokens 8.0B, Falcon3 family 1B-10B, Falcon-E 1B-3B. [microsoft/BitNet GitHub](https://github.com/microsoft/BitNet)
- The "100B BitNet b1.58 on a single CPU at 5-7 tok/s" claim refers to runtime capability; no 100B ternary model checkpoint is listed among supported models (inference: it is a synthetic/dummy-weight benchmark). [microsoft/BitNet GitHub](https://github.com/microsoft/BitNet)
- Intel's BITCOS paper (2026) surveys 29 ternary checkpoints across 7 families as the current landscape: BitNet b1.58 2B4T (2B, 4T tokens); Bonsai (Prism ML, 2026) dense 1.7B-27B; CAT-Q (PTQ ternary of Qwen3, ICML 2026, arXiv 2606.26650) 1.7B-235B incl. MoE 30B-A3B and 235B-A22B; ParetoQ 125M-1.5B; TriLM/Spectra 99M-3.9B; Maple (DeepGrove, 2026) 20B-A1B MoE "the largest ternary MoE"; BitCPM-CANN (OpenBMB, 2025) 0.5B-8B. Also cites TWLA (ICML 2026, PTQ ternary weights + low-bit activations), Tequila (2025, trapping-free ternary QAT), Sherry (2026, 1.25-bit ternary with fixed 3:4 pattern). [Intel, Breaking the 1.58-bit Barrier for Ternary LLMs, arXiv 2609.16338](https://arxiv.org/pdf/2609.16338)
- Zero density of released ternary checkpoints ranges 29.7% to 51.5% ("zeros account for up to 51.5% of all weights"), i.e. ternary models are natively ~30-50% sparse. [arXiv 2609.16338](https://arxiv.org/pdf/2609.16338)
- Ternary Bonsai 2 27B (Prism ML, Sept 17 2026): based on Qwen3.8 27B, ternary {-1,0,+1} weights with FP16 group-wise scales, 1.76 effective bits/weight, 5.9 GB total footprint (>9x smaller than full precision). Category scores vs Qwen3.8 27B full precision: agentic/tool calling 77.57 vs 79.74; coding 81.58 vs 82.17; instruction following 82.66 vs 81.25; knowledge & reasoning 83.95 vs 86.66; math 96.57 vs 97.06; vision 78.59 vs 81.64; overall 83.9 vs 85.4 (98.2% retention). The page does not state whether this is native ternary training, QAT, or PTQ conversion. [PrismML](https://prismml.com/news/bonsai-2-27b)
- Maple-Preview (DeepGrove, Aug 6 2026): 20B-total/1B-active ternary MoE reasoning model, 5.31 GB checkpoint; vendor claims 218 tok/s on an M4 Mac mini, "five to sixteen times faster than Gemma 4, Qwen3.5, or gpt-oss"; no transcribable benchmark comparison to full precision; native vs converted training not stated; unverified by the reporting outlet. [AI Weekly](https://aiweekly.co/alerts/deepgrove-open-sources-maple-preview-a-20b-a1b-ternary-moe)
- General characterization: 1.58-bit LLMs shown comparable to full-precision counterparts "up to several billion parameters"; BitNet was trained natively in 1.58 bits (BitLinear replacing nn.Linear). [Wikipedia, 1.58-bit LLM](https://en.wikipedia.org/wiki/1.58-bit_large_language_model)

**Scaling-law evidence**
- Kumar et al., "Scaling Laws for Precision" (ICLR 2025; arXiv Nov 2024, so older): 465 pretraining runs at 3-16 bits, up to 1.7B params and 26B tokens, D/N up to ~10^3 (extrapolated to ~10^5). [arXiv 2411.04330](https://arxiv.org/html/2411.04330v2)
- Effective parameter count under QAT (weights only): N_eff = N(1 - e^(-P_w/gamma_w)), gains saturate at ~6-7 bits; for weights+activations+KV low-precision training the effects multiply: N_eff = N(1-e^(-P_w/g_w))(1-e^(-P_a/g_a))(1-e^(-P_kv/g_kv)). [arXiv 2411.04330](https://arxiv.org/html/2411.04330v2)
- Compute-optimal pretraining precision ~7-8 bits, roughly independent of compute budget when N, D, P are jointly optimized; going below ~4 bits would require models >4x larger for the same loss; fixed-N compute-optimal precision rises ~logarithmically with data. Fit validated against FP4-FP32 float runs 220M-1.6B; fit strong down to 4 bits, integer and float behaviour diverge below that. [arXiv 2411.04330](https://arxiv.org/html/2411.04330v2)
- Ouyang et al. (2024, older) argue scaling laws favour low-bit weights only for undertrained models; deficiencies emerge as training tokens grow. [Wikipedia, 1.58-bit LLM](https://en.wikipedia.org/wiki/1.58-bit_large_language_model)
- ParetoQ (Liu et al., 2025, arXiv 2502.02631) reported that ternary and 2-bit formats sit on the accuracy-size Pareto frontier (as summarized by Intel). [arXiv 2609.16338](https://arxiv.org/pdf/2609.16338)

### Inferences
- At 4 bits the empirical gap is small even at very high tokens/param: 12B on 10T is ~830 tokens/param (far beyond Chinchilla ~20), yet NVFP4 stays within ~1.5% loss of FP8. This is the strongest evidence that FP4 native training does not collapse under heavy overtraining, and it is more optimistic than the Kumar et al. fit (which was calibrated with integer formats and small models). Block-scaled formats (16-element FP8 scales) plus selective BF16 layers appear to be what changes the picture.
- For ternary, the largest models with strong results (Bonsai 2 27B, CAT-Q 235B) are derived from full-precision bases, so they amortize a full-precision pretraining run; they tell us about inference cost, not about equal-training-compute quality. A frontier-scale from-scratch ternary run with an equal-compute FP baseline has not been published (as far as found).
- Practical effective precision for "near-lossless at 27B" ternary is 1.76 bpw (with group scales), not 1.58; the packing/scale overhead matters for bandwidth math.
- Ternary checkpoints carry 30-50% zeros natively, so ternary partially "contains" unstructured sparsity; stacking further sparsity on ternary has less headroom than on dense FP weights.

### Gaps
- Could not fetch the BitNet b1.58 2B4T paper or model card (allowlist block); its headline memory (widely reported ~0.4 GB non-embedding), CPU latency and energy-per-token vs Qwen2.5 1.5B / Llama 3.2 1B are not verified here.
- No published frontier-scale (>=30B dense, >=1T tokens) natively-ternary run with an equal-compute BF16 baseline found. Training method for Bonsai 2 and Maple undisclosed.
- No 2025-2026 scaling-law paper re-fitting Kumar et al. with block-scaled FP4 at >10B was found in this session (QuEST, Quartet and ParetoQ scaling claims not directly read).
- CAT-Q 235B ternary PTQ quality numbers not read (only its existence via Intel's survey).

## Q2. Measured speedups and energy reductions on real hardware for ternary/FP4 vs BF16; theoretical vs realized

### Takeaway
Realized gains are real but well below theoretical: bitnet.cpp on CPUs measures 1.37-6.17x speedup and 55-82% energy reduction vs FP16 for small models; on GPUs, NVFP4 W4A4 offers a 4x (GB200) to 6x (GB300) math ceiling over BF16 and ~3x FP8 peak inference throughput, but most published end-to-end numbers are 1.5-3x. Ternary's "multiplier-free" advantage barely shows on commodity hardware: optimized ternary kernels beat well-tuned 2-bit kernels by only 1.1-1.3x. Large multipliers (8-200x efficiency) appear only on FPGAs/ASICs with weights held on-chip or hardwired, at small model sizes or with vendor-only claims.

### Cited Findings
**CPU (bitnet.cpp and successors)**
- bitnet.cpp: ARM speedups 1.37x-5.07x with 55.4%-70.0% energy reduction; x86 speedups 2.37x-6.17x with 71.9%-82.2% energy reduction vs full-precision; up to 6.17x (x86) / 5.07x (ARM) for BitNet-b1.58-2B-4T. Jan 15 2026 CPU optimization added a further 1.15x-2.1x over the original implementation. Official GPU kernel released 05/20/2025; NPU "next". [microsoft/BitNet GitHub](https://github.com/microsoft/BitNet)
- Intel BITCOS (2026): bitnet.cpp shown not to reach roofline; best CPU baseline is LIBXSMM 2-bit kernels. BITCOS (variable-length ternary coding, 2 - z bits where z = zero density; as low as 1.485 bpw) cuts weight traffic 1.16-1.32x vs 2-bit packing. CPU GEMV vs 2-bit: Emerald Rapids 1.14-1.28x, Arrow Lake 1.13-1.27x, Lunar Lake slower at every density. End-to-end vLLM batch-1 decode: Emerald Rapids 1.10-1.18x, Arrow Lake 1.02-1.15x, Lunar Lake loses. Intel GPUs end-to-end: Arc 140V 1.09-1.22x, Arc Pro B70 1.02-1.27x. llama.cpp TQ1_0 (five-trit packing) 1.66-1.68x faster than Q2_0 on Arrow Lake, 1.91-2.44x on Lunar Lake. [arXiv 2609.16338](https://arxiv.org/pdf/2609.16338)
- Ternary CSC (Zhu et al., 2026, sparse addition-based GEMM) needs 75-88% sparsity to beat dense cuBLAS at layer level (as summarized by Intel), i.e. "multiplier-free" addition kernels lose to tensor-core multiplies on GPUs unless very sparse. [arXiv 2609.16338](https://arxiv.org/pdf/2609.16338)

**Consumer GPU / edge (2026, vendor)**
- Ternary Bonsai 2 27B: up to 143 tok/s on RTX 5090, 46.8 tok/s on M5 Max; 0.714 mWh/token on RTX 4090, claimed 40% more energy-efficient than an 8B model in full precision. [PrismML](https://prismml.com/news/bonsai-2-27b)
- 2-bit weight-only (W2A16) Qwen3 decode throughput vs FP16: Qwen3-8B batch 1 79 -> 128 tok/s (1.62x); Qwen3-32B batch 1 23 -> 70 tok/s (3.04x); batch 8: 1.57x (8B) and 1.68x (32B). Speedup grows with model size (more bandwidth-bound) and shrinks with batch. [Alimaskina et al., arXiv 2606.02011, June 2026](https://arxiv.org/pdf/2606.02011)

**Datacenter GPU FP4**
- Blackwell Tensor Cores: FP4 2x (GB200) and 3x (GB300) math throughput over FP8; 4x (GB200) and 6x (GB300) over BF16; FP4 operands roughly halve memory vs FP8. The NVFP4 pretraining paper reports no measured runtime or energy. [arXiv 2509.25149](https://arxiv.org/html/2509.25149v2)
- NVIDIA (June 2026): Llama-3.1 405B pretraining ~1.9x faster than FP8 in NVFP4; inference peak throughput up to ~3.0x FP8 on Blackwell; W4A4 GEMM up to 4x throughput ceiling over BF16 at ~1/4 memory traffic. Format overheads: MXFP4 ~4.25 bits/value (E8M0 scale per 32), NVFP4 ~4.5 bits/value (E4M3 scale per 16 + FP32 per-tensor); NVFP4 has ~88% lower quantization error than power-of-two scaling (NVIDIA claim). [NVIDIA Research blog](https://research.nvidia.com/labs/eai/blogs/pushing-intelligence-to-4-bit/)
- FP4 attention (SageAttention3): 1038 TOPS on RTX 5090, ~5x FlashAttention2; ~2.4-3x end-to-end on video diffusion. FLUX with SVDQuant+NVFP4: ~4x smaller, ~3x faster than BF16. [NVIDIA Research blog](https://research.nvidia.com/labs/eai/blogs/pushing-intelligence-to-4-bit/)

**FPGA / ASIC**
- TerEffic (FPGA, ternary, arXiv 2502.16473, 2025): fully on-chip 370M model on U280: 16,300 tok/s at 35.8 W (455 tok/s/W) batch 1, 192x throughput and 19x efficiency vs Jetson Orin Nano; batch 16: 32,600 tok/s, 513 tok/s/W (30x / 2.1x). HBM-assisted 2.7B batch 1: 727 tok/s at 46.2 W (16 tok/s/W) vs A100 250 tok/s at 124 W (2 tok/s/W): 3x throughput, 8x efficiency; at batch 16 TerEffic is 0.8x A100 throughput, 2.5x efficiency. 7B projection (~290 tok/s at 46 W) and 8 nm projections are estimates, not measured. [TerEffic](https://arxiv.org/html/2502.16473v2)
- Taalas HC1 (unveiled Feb 21 2026): Llama 3.1 8B hardwired into an ASIC with 4-bit weights ("store four bits and do the multiply related to it with a single transistor"); claims up to 17,000 tok/s per user (demo observed 15,000-16,000), ~200 W/card, vs ~230 tok/s on H200 for the same model (~74x); claims ~10x Cerebras per-user speed and 20x lower manufacturing cost than Cerebras. All vendor claims, no independent quality evaluation; chip fixed to one model (LoRA supported). [NYU Shanghai RITS](https://rits.shanghai.nyu.edu/ai/taalas-hc1-hardwiring-llama-3-1-into-silicon-for-17000-tokens-second/)

### Inferences
- Bandwidth-bound decode: the realizable multiplier from weight compression at batch 1 is roughly the bytes ratio (BF16 16 bits -> NVFP4 ~4.5 bits = ~3.6x; -> ternary at 1.6-2.0 bits = 8-10x), minus kernel inefficiency. Measured CPU numbers (up to ~6x) and the 3.04x for 32B W2A16 sit below these ceilings. At high batch, decode becomes compute- and KV-bound and weight-only gains shrink (1.57-1.68x at batch 8 in the 2-bit study).
- Ternary vs 2-bit is nearly a wash on CPUs/GPUs (1.0-1.3x), so for a GPU-targeted design "2-bit-class" and "ternary" are interchangeable from a cost perspective; the extra value of ternary (no multipliers) only materializes in custom silicon.
- Custom silicon is where order-of-magnitude multipliers live: on-chip ternary FPGA gives ~8x tok/s/W vs A100 at batch 1 for a 2.7B model and the Taalas hardwired 4-bit 8B claims ~74x per-user throughput vs H200. These are the only data points in this research approaching the 10-100x range, and both are small models.

### Gaps
- No independent measured energy-per-token comparison of FP4 vs BF16 on B200/GB300 for a large LLM at serving batch sizes was found.
- MLPerf Inference v6.0 (2026) FP4 results for NVIDIA and AMD were found only as search titles (AMD ROCm blog, AMD press release) and not read; per-accelerator tokens/s for DeepSeek-R1 FP4 are therefore not recorded here.
- Original BitNet b1.58 paper claims (e.g. 71.4x matmul arithmetic energy at 7 nm, 2.71x speed, 3.55x memory at 3B) could not be verified from a fetched source in this session.

## Q3. Quantizing activations and KV cache to low bits: state of the art and quality cost

### Takeaway
FP8 KV is routine; NVFP4 KV (2026, e.g. vLLM 0.32) halves KV vs FP8 at <1% accuracy loss per NVIDIA and raises concurrency several-fold; 2-3-bit KV is research-grade with small but nonzero loss. W4A4 (NVFP4 activations) PTQ of DeepSeek-R1 lands within ~1% of FP8. The danger zone is reasoning models at 2-bit weights: accuracy collapses on hard benchmarks (AIME 70 -> 16.7 for Qwen3-32B) and output length inflates ~7x, which can make low-bit inference slower and costlier end-to-end.

### Cited Findings
- NVFP4 KV cache: up to ~50% smaller than FP8 with <1% accuracy loss, ~5% better than MXFP4 KV (NVIDIA). In a video model, NVFP4 KV ~3.6x smaller with <2% dequant overhead; inference peak memory 36.4 GB (BF16) -> 19.4 GB with NVFP4 weights and KV, throughput 24.8 -> 32.0 FPS. [NVIDIA Research blog, June 2026](https://research.nvidia.com/labs/eai/blogs/pushing-intelligence-to-4-bit/)
- Cited prior KV results: KVQuant ~3-bit KV enabling 10M-token contexts; Quant VideoGen 2-bit KV up to 7x smaller at <4% latency overhead. [NVIDIA Research blog](https://research.nvidia.com/labs/eai/blogs/pushing-intelligence-to-4-bit/)
- PTQ DeepSeek-R1 NVFP4 vs FP8: MMLU-Pro 85 vs 84; GPQA 81 vs 80; AIME 2024 89 vs 91; "within ~1% of FP8 overall". [NVIDIA Research blog](https://research.nvidia.com/labs/eai/blogs/pushing-intelligence-to-4-bit/)
- On B200, Qwen3-32B max batch at 32K context rose from 9 (FP16 KV) to 61 with W4A16 weights + NVFP4 KV (~6.8x concurrency); macro accuracy FP16 vs NVFP4 setups: Qwen3-8B 84.79 vs 80.90; Qwen3-32B 86.23 vs 85.29. [arXiv 2606.02011](https://arxiv.org/pdf/2606.02011)
- 2-bit weights (W2A16, GPTQ-style) on reasoning models: Qwen3-32B MATH-500 93.0 -> 65.0, GPQA-D 66.16 -> 42.93, AIME 2026 70.0 -> 16.67, GSM8K 95.83 -> 93.33; Qwen3-8B MATH-500 92.4 -> 17.2, GSM8K 96.13 -> 52.69. Mean reasoning length 1,792 (FP16) -> 12,222 tokens (2-bit), ~6.8x; Qwen3-8B 2-bit 90.2% loop rate. Raw 2-bit end-to-end task speed 0.23x FP16 (slower, due to long traces); with loop rescue 2.21x; with FP16 planning + loop rescue 1.81x and MATH-500 (32B) recovers to 87.2. [arXiv 2606.02011](https://arxiv.org/pdf/2606.02011)
- Larger models degrade less under 2-bit (32B vs 8B gaps above), consistent with Kumar et al.'s finding that PTQ degradation shrinks with N. [arXiv 2606.02011](https://arxiv.org/pdf/2606.02011); [arXiv 2411.04330](https://arxiv.org/html/2411.04330v2)
- Additional 2025-2026 KV work surfaced but not read: Kitty (2-bit KV with dynamic channel-wise precision boost, arXiv 2511.18643), Dual-QK (prunable 2-bit KV caches, arXiv 2610.09827), DeepSeek-V4.1-Flash KV cache compression report (arXiv 2609.19969), vLLM 0.32 NVFP4 KV support. [search result: Kitty](https://arxiv.org/pdf/2511.18643); [Dual-QK](https://arxiv.org/pdf/2610.09827); [DeepSeek-V4.1-Flash](https://arxiv.org/pdf/2609.19969); [Spheron on vLLM NVFP4 KV](https://www.spheron.network/blog/vllm-nvfp4-kv-cache-in-0-32-more-concurrent-requests-per-gpu/)

### Inferences
- For long-context/agentic workloads KV bytes, not weight bytes, dominate decode bandwidth at realistic batch sizes, so KV precision (FP8 -> NVFP4 -> 2-3-bit) is as important a lever as weight precision; a 4x KV reduction vs BF16 at <1% loss is available today on Blackwell-class hardware.
- Quality metrics must include token-efficiency: a low-bit reasoning model that loops can cost more per solved task than the BF16 model. Any "x cheaper" claim for a reasoning model should be measured per correct answer, not per token.

### Gaps
- No primary-source numbers on 2-bit or ternary activations at >7B in production; BitNet's 8-bit (or 4-bit, BitNet a4.8 / v2) activation results were not fetched.
- Read only titles of Kitty, Dual-QK and DeepSeek-V4.1-Flash; their accuracy/compression numbers are not recorded.

## Q4. Does low-bit training/quantization interact badly with overtraining?

### Takeaway
For post-training quantization, yes: Kumar et al. show PTQ degradation grows with tokens trained and that past a critical data size more pretraining data can make the quantized model worse. Low-bit QAT or native low-bit training largely avoids this at 4 bits (12B/10T NVFP4 within ~1.5% of FP8 loss), so the practical prescription for heavily overtrained, inference-optimized models is to train or QAT in the target format rather than PTQ.

### Cited Findings
- PTQ degradation model: delta_PTQ proportional to D^gamma_D / N^gamma_N x e^(-P_post/gamma_post), R^2 = 0.97; degradation grows with data D, shrinks with size N, rises exponentially as precision drops; "Overtrained language models are more sensitive to post-training quantization"; beyond a critical data size, extra pretraining data can hurt inference-time performance of models that will be quantized. [arXiv 2411.04330](https://arxiv.org/html/2411.04330v2)
- At fixed compute and fixed precision, lower precision favours more parameters and less data; with N fixed, compute-optimal precision rises ~log with data. [arXiv 2411.04330](https://arxiv.org/html/2411.04330v2)
- Counter-evidence at 4 bits with native training: 12B on 10T tokens (~830 tokens/param) in NVFP4 stays <1% relative loss gap during stable phase, ~1.5% at end of decay, ~0.5% if last ~6% of compute is BF16. [arXiv 2509.25149](https://arxiv.org/html/2509.25149v2)
- QAT is used in production precisely to avoid PTQ losses: DeepSeek-V4 FP4 QAT on experts; GPT-OSS MXFP4 QAT on experts (>90% of params). NVIDIA notes PTQ "leaves accuracy on the table" and QAT recovers it at added compute cost (no numeric gap given). [NVIDIA Research blog](https://research.nvidia.com/labs/eai/blogs/pushing-intelligence-to-4-bit/)
- Ouyang et al. (2024): low-bit weights favoured only for undertrained models; deficiencies appear as tokens increase. [Wikipedia](https://en.wikipedia.org/wiki/1.58-bit_large_language_model)

### Inferences
- The overtraining penalty is mostly a PTQ phenomenon. An inference-optimized design that heavily overtrains a small model (the usual route to cheap inference) should bake the low-bit format into pretraining or a long QAT phase; PTQ to <=4 bits of an overtrained checkpoint is the worst combination.
- The open question for the 1000x program is whether the same holds at 1.58-2 bits. Kumar et al. predict sub-4-bit needs >4x params for equal loss, which would eat most of a 2-2.5x bytes advantage of ternary over FP4 in a pure bandwidth model, unless block-scaled ternary behaves better than their integer fits (Bonsai 2's 98.2% retention at 27B hints it may, but its training compute is not disclosed).

### Gaps
- No ternary-specific scaling law at >10B with D/N >= 100 from primary sources found in this session (TriLM/Spectra and ParetoQ scaling claims known only via Intel's summary).
- No quantified QAT-vs-PTQ gap for FP4 at frontier scale in fetched sources.

## Q5. Pruning and structured sparsity: realized gains at scale, and whether it stacks with quantization

### Takeaway
2:4 sparsity alone gives modest real speedups (1.1-1.3x end-to-end) at ~97-98% accuracy recovery after retraining; combined with 4-bit weights it reaches 2-3x single-stream latency on Ampere-class GPUs. Sparsity and quantization do compound in compression ratio, and at a fixed 8x budget "4-bit + 50% sparsity" beats either pushed alone, but quality costs add and 2:4 is worse than unstructured at equal density. Ternary models are already 30-50% zeros; semi-structured ternary sparsity (Sparse-BitNet 6:8, Sherry 3:4) yields only ~1.3x more.

### Cited Findings
- 2:4 Sparse Llama 3.1 8B (Red Hat/Neural Magic, Feb 2025): 98.4% recovery on Open LLM Leaderboard v1, 97.3% on Mosaic Eval Gauntlet, 101.1% on fine-tuning tasks; retrained on 13B tokens, 26 h on 32 H100s. Sparsity alone in vLLM: up to 30% higher throughput and 20% lower latency; single-stream latency 1.1-1.2x. Sparse + W4A16: single-stream latency 3.0x (A5000, A6000), 2.1x (A100); max query throughput 1.8x (A5000), 1.4x (A6000), 1.2x (A100). [Red Hat Developer](https://developers.redhat.com/articles/2025/02/28/24-sparse-llama-smaller-models-efficient-gpu-inference)
- Mozaffari, "Compression Trinity" PhD thesis (U Toronto, 2026), LLaMA-2-7B at matched 8x compression (8-task zero-shot avg; dense FP16 54.61%): 2-bit only 31.81%; 87.5% unstructured only 31.24%; 4-bit + 2:4 47.97%; 4-bit + 50% unstructured 52.38%. Sparsity alone hurts more than 4-bit quantization (48.62% at 2x vs 53.63% at 4x). SLiM (quant + 2:4 + low-rank adapters, one-shot) up to 4.3x layer-wise speedup; PATCH (hybrid dense/2:4 tiles) 1.18-1.38x end-to-end on LLaMA-2 7B; SLoPe up to 1.34x inference speedup on OPT-66B. Self-reported, mostly "up to" values. [arXiv 2608.24070](https://arxiv.org/pdf/2608.24070)
- Thesis conclusion: sparsity mainly reduces compute, quantization mainly reduces memory traffic, low-rank adapters restore accuracy; single-pillar compression "hits an accuracy wall". [arXiv 2608.24070](https://arxiv.org/pdf/2608.24070)
- Ternary + sparsity: Sparse-BitNet (2026, arXiv 2603.05168) semi-structured ternary sparsity, up to 1.30x end-to-end speedup; its 6:8 ternary models lose 0.17-0.32 perplexity and 0.8-3.8 downstream points vs dense ternary. Sherry (2026): 1.25-bit ternary with fixed 3:4 pattern. Natural zero density in ternary checkpoints 29.7-51.5%. [arXiv 2609.16338](https://arxiv.org/pdf/2609.16338)

### Inferences
- Realistic multiplier from weight sparsity on GPUs: ~1.1-1.4x end-to-end, plus a compression-ratio effect when stacked with quantization (2:4 removes half the weight bytes, minus metadata). It compounds with quantization multiplicatively in bytes, but sub-multiplicatively in realized speed and additively (worse) in quality.
- MoE is a far bigger "sparsity" lever than weight pruning (e.g. Maple 20B-A1B activates 5% of params); the evidence here suggests spending the sparsity budget on activation sparsity (MoE) and the precision budget on FP4/ternary, rather than on unstructured weight pruning.

### Gaps
- No 2025-2026 measured result of 2:4 sparsity combined with FP4 on Blackwell at >=70B found (Rubin/Blackwell sparse FP4 peak numbers exist only as spec sheets).
- Activation-sparsity results (e.g. arXiv 2602.06183 on 2:4 activation sparsity in pretraining; arXiv 2511.04477 dynamic sparsity in quantized inference) surfaced only as search titles.

## Q6. Hardware support: NVIDIA Blackwell/Rubin FP4, AMD MI-series, dedicated ternary chips

### Takeaway
FP4 is now the first-class inference datatype on NVIDIA (Blackwell NVFP4/MXFP4, Rubin with 50 PFLOPS NVFP4 inference) and AMD (MXFP4 on MI355X with MLPerf v6.0 submissions); on Rubin the paper ratio of NVFP4 inference to BF16 compute is ~12.5x. No mainstream GPU has native ternary/1.58-bit tensor cores; ternary runs as 2-bit or packed formats. Dedicated low-bit silicon exists as FPGA research (TerEffic, TeLLMe) and hardwired-model ASICs (Taalas HC1, 4-bit), with large but vendor-claimed multipliers.

### Cited Findings
- NVIDIA Rubin (per Tom's Hardware, July 21 2026): NVFP4 inference 50 PFLOPS (article labels this a sparsity-based rate), NVFP4 training 35 PFLOPS, FP8/FP6 training 17.5 PFLOPS, FP16/BF16 4 PFLOPS, INT8 250 TOPS; 288 GB HBM4 at 22 TB/s; two compute dies, 224 SMs, 896 Tensor Cores; doubled K-dimension Tensor Core throughput vs Blackwell; BF16 exponential throughput 4x on Rubin vs Blackwell. No cost-per-token numbers. Vera Rubin deliveries "this fall" (2026). [Tom's Hardware](https://www.tomshardware.com/pc-components/gpus/nvidia-details-rubin-architectural-optimizations-for-inference-improvements-target-better-performance-and-efficiency-from-the-gpu-to-the-rack)
- Blackwell: FP4 2x (GB200) / 3x (GB300) over FP8, 4x / 6x over BF16. [arXiv 2509.25149](https://arxiv.org/html/2509.25149v2)
- AMD MLPerf Inference v6.0 submissions (2026) exist, including DeepSeek-R1 FP4 inference with SGLang on Instinct GPUs (titles only, not read). [AMD ROCm blog](https://rocm.blogs.amd.com/artificial-intelligence/mlperf-inference-v6.0/README.html); [AMD blog](https://www.amd.com/en/blogs/2026/amd-delivers-breakthrough-mlperf-inference-6-0-results.html)
- Intel CPUs/GPUs run ternary via 2-bit (LIBXSMM, XeTLA int2) or BITCOS variable-length codes, with ternary-specific gains of only 1.0-1.3x over int2. [arXiv 2609.16338](https://arxiv.org/pdf/2609.16338)
- FPGA ternary (TerEffic, 2025) and hardwired 4-bit ASIC (Taalas HC1, Feb 2026) figures as in Q2. [TerEffic](https://arxiv.org/html/2502.16473v2); [NYU Shanghai RITS](https://rits.shanghai.nyu.edu/ai/taalas-hc1-hardwiring-llama-3-1-into-silicon-for-17000-tokens-second/)
- Other 4-bit formats emerging: HiFloat4 (arXiv 2607.26515, 2026) for end-to-end RL post-training (title only). [arXiv 2607.26515](https://arxiv.org/pdf/2607.26515)

### Inferences
- Multiplier ledger vs a BF16 dense baseline on GPUs (rough, for the 1000x budget): NVFP4 weights+activations ~3.5x bytes and 4-6x (Blackwell) to ~9-12x (Rubin spec ratios, partly sparsity-dependent) peak math; NVFP4 KV ~3.5-4x KV bytes; 2:4 sparsity ~1.1-1.4x realized; ternary over FP4 ~2-2.5x bytes but ~1.0-1.3x realized over 2-bit kernels on non-custom hardware. Realistically, numerics contribute ~3-6x on GPUs at equal quality today, perhaps ~8-10x with ternary/2-bit at a quality cost; reaching 1000x requires multiplying this with MoE activation sparsity (e.g. 20x active-param reduction), distillation to smaller models, and possibly custom silicon (FPGA/ASIC data points of ~8x-74x, small models, partly vendor claims).
- These levers compound in bytes but not perfectly in quality: low-bit, sparsity and small-active-param MoE each reduce effective capacity (Kumar et al.'s multiplicative N_eff), so the quality losses also multiply. The strongest stack observed in 2026 production is FP4-QAT on MoE experts (DeepSeek-V4, GPT-OSS), which combines ~4x numerics with large activation sparsity.

### Gaps
- AMD MI355X/MI400-series MXFP4 peak numbers and MLPerf v6.0 throughput figures not read.
- Whether Rubin's 50 PFLOPS NVFP4 inference requires 2:4 sparsity or a different "adaptive compression" mechanism is ambiguous; Tom's Hardware labels it "with sparsity", and NVIDIA's own spec page was not checked.
- No production dedicated ternary ASIC with independently measured LLM tokens/J was found; TeLLMe (edge FPGA ternary accelerator) surfaced only as a title.
