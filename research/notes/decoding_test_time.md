# Decoding Efficiency and Test-Time Compute Economics (state as of Nov 2026)

Scope: speculative decoding (EAGLE-3, Medusa, draft models, lookahead), multi-token prediction (DeepSeek MTP and successors such as DSpark), diffusion LLMs (Mercury 1/2/2.5/3, Gemini Diffusion, DiffusionGemma, LLaDA 2.x), reasoning efficiency (token budgets, overthinking, adaptive thinking, latent reasoning), and per-token vs per-task economics. Dates are marked; pre-2025 results are flagged as older.

Framing used throughout: **cost per solved task = (tokens per task) x (cost per token)**, where cost per token = f(active params, precision, hardware, batch/utilization). Decoding tricks act mostly on latency and on utilization at small batch; reasoning efficiency acts on tokens per task; diffusion acts on per-user speed and (possibly) on utilization. Only some of these multiply cleanly.

---

## Q1. Realized speedups of speculative decoding and MTP in production at large batch vs batch size 1; does it save energy or only latency?

### Takeaway
Speculative decoding is mainly a latency/interactivity lever: 2-6.5x at batch size 1, falling to roughly 1.4x throughput at batch 64 for EAGLE-3. In 2026 production (DeepSeek DSpark), it gives 57-85% more per-user speed than MTP-1 at the same aggregate throughput, which is a gain in interactivity, not in tokens per GPU. Energy savings are real at batch 1 for the best methods (about 1.3-2.5x) but can be negative for weak drafters. Expect at most about 1.3-2x on cost per token at serving-scale batches, not an order of magnitude.

### Cited Findings
**EAGLE-3 (paper Mar 2025, NeurIPS 2025)**
- Speedup of up to 6.5x, about 1.4x better than EAGLE-2. **In SGLang at batch size 64, the throughput gain is 1.38x.** Models evaluated include Vicuna 13B, LLaMA-Instruct 3.1 8B, LLaMA-Instruct 3.3 70B and DeepSeek-R1-Distill-LLaMA 8B. | [EAGLE-3 arXiv abstract](https://arxiv.org/abs/2503.01840)
- Production-style deployment (LMSYS/SGLang on Vertex, Dec 2025): "2x-3x decoding speedup" in latency for Llama 4 Scout 17B and Llama 70B, depending on workload (multi-turn, code, long context). The zero-overhead overlap scheduler adds 10-20% more. The draft head is 2-5% of target model size. TTFT may increase. Per-concurrency numbers appear only in charts. | [LMSYS blog, Dec 1 2025](https://lmsys.org/blog/2025-12-01-eagle3-vertex/)

**Large-batch evidence (2024, older)**
- MagicDec reports up to 2.51x speedup for Llama3.1-8B when serving batches of 32-256 at moderate to long sequence lengths. It challenges the "only useful at small batch" view by using a sparse-KV-cache draft, because the KV-cache bottleneck grows with both batch and sequence length. It claims no accuracy loss. | [MagicDec arXiv 2408.11049](https://arxiv.org/abs/2408.11049)

**MTP / DeepSeek lineage**
- DeepSeek-V3 (Dec 2024, older) uses a multi-token-prediction training objective "for stronger performance". | [DeepSeek-V3 tech report](https://arxiv.org/abs/2412.19437). The widely cited figures of 85-90% second-token acceptance and about 1.8x TPS from reusing the MTP module for speculative decoding are in the report body (Sec. 5.4.3). The fetched abstract page did not show them, so they were not re-verified in this session.
- **DSpark (DeepSeek, Jun 29 2026)** is a speculative decoding framework for DeepSeek-V4 Flash/Pro. It combines a parallel (semi-autoregressive) backbone with a lightweight sequential module, and uses confidence- and load-aware verification scheduling that adjusts draft length to predicted acceptance and system load. **On live production traffic, against the earlier MTP-1 production setup at matched aggregate throughput:** V4-Flash per-user generation speed rose 60-85% and V4-Pro rose 57-78%. Offline on Qwen3 4B/8B/14B, average accepted draft length is 26.7-30.9% longer than EAGLE-3 and 16.3-18.4% longer than DFlash. No quality-impact data or batch sizes were given. | [Analytics India Magazine on DSpark](https://analyticsindiamag.com/ai-news/deepseek-v4-is-now-up-to-85-faster-with-new-inference-technique)

**Energy (Feb 2026, batch size 1 only)**
- Benchmarking the Energy Savings with Speculative Decoding Strategies, given as (speedup / energy-saving factor):
  - EAGLE-3 on Vicuna-13B: 2.91x / 2.51x on HumanEval, 2.76x / 2.09x on GSM-8K, 2.17x / 2.10x on CNN-DM.
  - EAGLE-3 on Llama-8B: 2.90x / 2.09x on HumanEval.
  - **EAGLE-3 on Llama-70B: only 1.35x / 1.34x.**
  - Classic draft-model approaches (COGA/DYGA) often gave about 1.0x speedup and **energy factors below 1**, i.e., more energy than vanilla decoding: 0.63-0.64x on Llama-70B CNN-DM and 0.80x on Qwen3-8B.
  - Absolute total energy: EAGLE-3 used 10.46 Wh per 1K tokens on Llama-70B (A6000, NF4) and 1.81 Wh per 1K tokens on Vicuna-13B.
  - Overheads (CPU, memory, verification) take 6-10% of runtime and can erase marginal gains. The authors call it "not a silver bullet".
  - Only batch size 1 was tested, on a single A5000/A6000 with NF4 4-bit targets. | [arXiv 2602.09113](https://arxiv.org/pdf/2602.09113)

### Inferences
- At batch 1, decoding is memory-bandwidth-bound, so speculation converts idle FLOPs into accepted tokens. This is why energy per token drops at batch 1 (up to about 2.5x). At large batch the GPU is closer to compute-bound and rejected draft tokens are wasted FLOPs, so throughput gains shrink to about 1.2-1.4x (EAGLE-3: 6.5x down to 1.38x at bs=64). The exception is long context (MagicDec), where KV reads dominate.
- DSpark's "matched aggregate throughput" framing is the honest production metric. Speculation buys interactivity, letting you hold a stricter tokens/sec-per-user SLA at the same fleet size, rather than buying more tokens per GPU-hour. For a cost-per-token goal its multiplier is about 1.0-1.5x. For a latency or user-experience goal it is about 1.6-3x.
- Compounding: speculation overlaps with other levers that also reduce memory-boundness (quantization reduces bytes per token; large batch raises arithmetic intensity). It therefore does **not** multiply cleanly with them. In a fleet already run at high batch with FP4/FP8 weights, the residual gain is the low end (about 1.2-1.4x).
- MoE caveat (inference, not measured here): verifying k draft tokens per sequence touches more distinct experts than decoding one token, which raises memory traffic. This plausibly erodes speculation gains for sparse MoE at moderate batch. DeepSeek's production gains of 57-85% on V4 (an MoE) show it still pays off for interactivity.
- Energy: the evidence supports energy savings only at batch 1 and only for strong drafters (EAGLE family). No measured large-batch energy data was found.

### Gaps
- No measured production J/token for speculation at large batch was found.
- Medusa and lookahead (n-gram/Jacobi) decoding: no 2025-2026 production numbers were retrieved in this session. The 2026 energy paper covered Medusa, but its Medusa figures were not extracted.
- DSpark absolute throughput, batch sizes and quality effect were not reported in the available coverage.
- The DeepSeek-V3 MTP acceptance rate (85-90%) and 1.8x TPS were not re-verified from the primary text in this session.

---

## Q2. Diffusion LLM throughput claims and quality vs similar-size autoregressive models; scaling evidence

### Takeaway
Diffusion LLMs reliably show about 1,000-1,500 tokens/sec per user on H100-class GPUs, roughly 5-15x common AR API speeds. That figure is per-stream speed at small batch, not demonstrated cost per token at large batch. On quality, Google's same-family comparisons show diffusion trailing AR on reasoning and knowledge (GPQA 40.4 vs 56.5 for Gemini Diffusion vs Flash-Lite; AIME 2026 69.1 vs 88.3 for DiffusionGemma vs Gemma 4). Inception's Mercury 2/3 claim parity with small frontier AR models (Haiku/mini class), but all of it is self-reported. Mercury 3 (Oct 2026) list pricing of $0.70/M output tokens is the best available proxy for actual cost.

### Cited Findings
**Inception Labs Mercury**
- **Mercury Coder (launch Feb 2025, older):** Mini 1,109 tok/s and Small 737 tok/s, "over 1000 tokens/sec on NVIDIA H100s". AR comparisons: Gemini 2.0 Flash-Lite 201, Qwen 2.5 Coder 7B 207, Claude 3.5 Haiku 61, GPT-4o Mini 59 tok/s.
  - Quality: HumanEval 88.0 (Mini) / 90.0 (Small), roughly matching GPT-4o Mini (88.0). LiveCodeBench 17.0 / 25.0 vs Haiku 31.0 and DeepSeek Coder V2 Lite 37.8, so it trails on harder coding.
  - The page's own speed claims are inconsistent: "about 4 times faster" than GPT-4o Mini in Copilot Arena vs about 19x in the table. | [Inception, Introducing Mercury](https://www.inceptionlabs.ai/introducing-mercury)
- **Mercury 2 (Jun 18 2026, first reasoning dLLM):** about 1,000 tok/s, compared with about 89 tok/s for Claude Haiku 4.5 Reasoning and 71 for GPT-5 Mini. AIME 2026 90%, GPQA 77%.
  - Augment Code case study: replacing Claude Opus 4.7 with Mercury 2 on a context-compaction subagent gave 82% lower latency and 90% lower cost at the same output quality (joint case study). | [Decrypt, Jun 21 2026](https://decrypt.co/371722/inception-labs-mercury-2-ai-beats-googles-diffusiongemma)
- Mercury 2, vendor blog: "over 1,000 tokens/second on NVIDIA H100s", TTFT under 300 ms, and a 300-token reasoning trace in under 300 ms vs AR at about 60-100 tok/s. Price $0.25/M input and $0.75/M output. Four `reasoning_effort` levels. | [Inception blog](https://inceptionlabs.ai/blog/mercury-2-the-first-reasoning-model-fast-enough-to-pick-up-the-phone)
- **Mercury 3 (Oct 19 2026)**, after Mercury 1, 2 and 2.5:
  - Size and speed: ">40x larger than Mercury 1" (parameters undisclosed) and 1,068 tok/s on Nvidia GPUs. The GPU model and test settings were not disclosed.
  - Context: 1M tokens (Mercury 2.5 had 260K).
  - Pricing: $0.20/M input and $0.70/M output (launch $0.10/$0.35), with cached input 90% off.
  - Benchmarks: SWE-Bench Atlas 51.08, about 18 points ahead of the rivals. DeepSWE v1 46.31 vs 51.62 for Claude Haiku 5.5.
  - Inception claims the AR scaling laws "hold for diffusion too". CEO Ermon calls it "comparable to the Luna and Haiku models, but it's way faster".
  - **All figures are self-reported, and no independent testing had been published**. Outlets disagree on the benchmark win tally. | [Let's Data Science, Mercury 3](https://letsdatascience.com/news/inception-releases-mercury-3-diffusion-llm-claiming-1000-tok-cb32df3e)

**Google**
- **Gemini Diffusion (announced at I/O, May 2025; still an "experimental demo")**: 1,479 tok/s excluding overhead, plus 0.84 s of overhead. Comparison with Gemini 2.0 Flash-Lite:
  - Comparable on code: LiveCodeBench 30.9 vs 28.5, HumanEval 89.6 vs 90.2, MBPP 76.0 vs 75.8.
  - Much worse on reasoning and knowledge: **GPQA Diamond 40.4 vs 56.5**, BIG-Bench Extra Hard 15.0 vs 21.0, Global MMLU Lite 69.1 vs 79.0, SWE-Bench Verified 22.9 vs 28.5.
  - Slightly better on AIME 2025: 23.3 vs 20.0. | [DeepMind Gemini Diffusion page](https://deepmind.google/models/gemini-diffusion/)
- **DiffusionGemma (2026, open weights):** "similar speeds" to Mercury 2. **AIME 2026 69.1% vs 88.3% for AR Gemma 4**, GPQA 73.2%. Google's own guide recommends standard Gemma 4 for maximum quality. | [Decrypt](https://decrypt.co/371722/inception-labs-mercury-2-ai-beats-googles-diffusiongemma)

**Ant Group LLaDA 2.x (open)**
- LLaDA2.0-flash is 100B (MoE), with block size 32. On 8x H20 under SGLang TP8:
  - The CAP variant reaches 500 TPS and the standard model 383 TPS, vs 258 and 237 TPS for AR baselines. That is "up to 1.9x" over AR at **small batch sizes**.
  - A quicksort demo showed 935 vs 263 tok/s against gpt-oss-120B (MXFP4).
  - Batching support was still "(reviewing)", and there is **no large-batch data**. | [LMSYS blog, Dec 19 2025](https://www.lmsys.org/blog/2025-12-19-diffusion-llm)
- LLaDA2.1 (Feb 2026, arXiv 2602.08676; 100B Flash and 16B Mini) uses draft-and-edit with two modes on one set of weights:
  - "S Mode" (speed) reaches 892 tok/s on HumanEval+, 801 on BigCodeBench and 663 on LiveCodeBench, with scores dipping "slightly".
  - The quantized Mini reaches 1,587 tok/s.
  - "Q Mode" (quality) beats LLaDA2.0 but runs slower.
  - dLLMs are described as having "higher base error rates than autoregressive models". | [Maxim AI on LLaDA2.1](https://www.getmaxim.ai/blog/beyond-autoregression-llada2-1-and-the-case-for-self-editing-language-models/)

### Inferences
- The tokens/sec headline (about 1,000-1,500) is a **per-stream** speed. A dLLM refines a block of tokens per forward pass, so it gets AR's batching benefit inside one sequence. At large serving batch, an AR server is already compute-efficient, and the dLLM's per-token FLOPs (several denoising steps over the block, often without KV-cache reuse) could equal or exceed AR. No source in this session measured dLLM cost per token at high batch. The LMSYS LLaDA post explicitly limits its 1.9x to small batch.
- Price is the best proxy for cost. Mercury 3 at $0.70/M output is in the small-model tier, cheap but not 10x cheaper than AR peers. Per The Deep View (via Let's Data Science), the launch price is only 35% cheaper on output than the rivals. Diffusion's realized cost lever therefore looks like roughly 1-2x per token, with its real advantage being latency (5-15x per user).
- Quality gap: same-lab, same-generation comparisons (Google) show a large gap on reasoning (GPQA -16 points, AIME 2026 -19 points). Inception's parity claims are vendor benchmarks against small-tier models. On "comparable quality to frontier", dLLMs are not there as of Nov 2026.
- Diffusion does help reasoning economics on wall-clock time: Mercury 2 completes a 300-token reasoning trace in about 300 ms. If test-time compute is the main quality lever (Q4), a fast sampler makes more samples or longer chains feasible within a latency budget. That is a latency enabler, not a FLOP reducer.
- Compounding: dLLM gains overlap with speculative decoding, since both parallelize decoding to exploit idle compute. They should not be multiplied together. dLLMs can stack with MoE (LLaDA2.0 is MoE) and quantization (LLaDA2.1 Mini quantized gives 1,587 tok/s).

### Gaps
- No independent (e.g., Artificial Analysis) measurements of Mercury 2/3 speed or quality were retrieved.
- No large-batch throughput or J/token data for any dLLM.
- No controlled scaling-law study (dLLM vs AR, compute-matched) was retrieved. Inception's "scaling laws hold" claim is unquantified.
- Mercury 3's parameter count and hardware are undisclosed.

---

## Q3. Tokens per task for frontier reasoning models; how much can token-efficient reasoning cut this without quality loss?

### Takeaway
Tokens per task are rising, not falling. On Artificial Analysis Intelligence Index v5 (Oct 2026), median output per task is about 59k tokens, up from about 35k in v4.3, and every model rose. At near-identical scores, frontier models differ about 4.4x in tokens per task (Claude Opus 5.5 max about 119k vs GPT-6 Astra about 27k) and about 13x in cost per task. Research methods reliably cut reasoning tokens about 45-60% with roughly ±3 points of accuracy (sometimes gains), mostly shown on small models and math. Meanwhile, cost per task at a *fixed capability* has fallen about 13x per year (Epoch), including a 725x drop in under 18 months for GPQA-75%. Per-task is the right metric.

### Cited Findings
**Artificial Analysis Intelligence Index v5 (Oct 27 2026)**
- Median output tokens per task: 35k (v4.3) to **59k (v5)**. "Every model we measured generates more output tokens per Intelligence Index task than in v4.3."
- Four agentic evals (Terminal-Bench-Science, Terminal-Bench 4.0, AA-Briefcase, FrontierCode 2.0) carry 55% of the index weight but produce about 90% of output tokens. Terminal-Bench-Science alone is about a third.
- Scores: Claude Opus 5.5 (max) 58, GPT-6 Astra (max) 57, GPT-6.1 Sol (max) 55, Gemini 4 Argon (high) 50, Claude Haiku 5.5 (max) 36, Claude Opus 5.5 (low) 35, DeepSeek V4.1 Flash and GLM-5.3 (open weights, max) 32.
- **Cost per task:**
  - GPT-6.1 Terra (max) $0.96 and Claude Opus 5.5 (low) $0.98.
  - GPT-6.1 Sol $1.27 and GPT-6 Astra $6.24.
  - Opus 5.5 (max) $10.04 and Claude Fable 5.1 $13.04.
  - That is more than a 13x spread among top models.
- Opus 5.5 at max costs about 10x more per task than at low, for +23 points. GPT-6.1 Sol is within 4 points of Opus 5.5 (max) at about one-eighth the cost per task.
- Effort spread is growing: Sonnet 5.5 spans 29 points from low to max (20 in v4.3), and GPT-6.1 Sol 20 points (10 before). | [Artificial Analysis, Intelligence Index v5](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5)
- **Output tokens per Index task (max effort):** Opus 5.5 about 119k (1.6x Opus 5), Opus 5 about 73k, Fable 5.1 about 78k, **GPT-6 Astra about 27k**. Opus 5.5 is priced at $4/$20 per M tokens (20% below Opus 5), so it is level with Opus 5 on cost per task despite 1.6x the tokens. Four of five effort levels sit on the intelligence-vs-cost-per-task Pareto frontier. | [Artificial Analysis, Claude Opus 5.5](https://artificialanalysis.ai/articles/claude-opus-5-5)

**Epoch AI, "The plunging price of thought" (Sep 22 2026)**
- The cost of a fixed performance level fell about **47% per quarter, or 13x per year**, since 2023 (robustness range 42.9-58.0% per quarter). Math fell faster (16-19x per year) and game puzzles slower (7-10x per year).
- At the SOTA frontier the decline is 66% per quarter (75x per year), slowing to 4.7x per year two years after SOTA.
- o3 (Jan 2025) cost about $0.30 per question for 75% on GPQA Diamond. **GPT-5.6 Luna reached the same for $0.0004 per question, a 725x drop in under 18 months.**
- Reasoning models consume far more tokens per task but can reach good performance from smaller, cheaper base models. Epoch does not quantify tokens-per-task growth. | [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)

**Measured reductions from token-efficient reasoning methods**
- **AdaptThink (May 2025)**, which teaches the model when to skip thinking, on DeepSeek-R1-Distill-Qwen-1.5B: response length **-53% on average with +2.4% accuracy**. By benchmark: GSM8K -50.9% (+4.1), MATH500 -63.5% (+1.4), AIME24 -44.7% (+1.6). | [arXiv 2505.13417](https://arxiv.org/pdf/2505.13417v1)
- **ThinkPrune (Apr 2025; TMLR 2026)**, RL with length limits: reasoning length **halved with about a 2% drop** on AIME24 (R1-Distill-Qwen-1.5B). | [arXiv 2504.01296](https://arxiv.org/abs/2504.01296)
- **Selective Latent Thinking (v2 Oct 2026)**, latent compression of CoT:
  - Llama-3.2-1B: explicit reasoning **-58.4% for -2.8 points**.
  - The method is fragile: naive arbitrary-span latent compression on Qwen3-4B GSM-Hard dropped accuracy from 54.7% to 17.3%, but keeping numerical tokens explicit held it at 51.8%.
  - Against Latent-GRPO: +5.6 points with 13% fewer tokens. | [arXiv 2605.25745](https://arxiv.org/abs/2605.25745)
- Agentic overthinking: selecting solutions with lower "overthinking scores" improved performance 30% while cutting compute overhead 43%. | [Stop Overthinking survey, arXiv 2503.16419](https://arxiv.org/pdf/2503.16419v4)
- Pathological example: answering "0.9 vs 0.11" took QwQ-32B 19 s and DeepSeek-R1 42 s. | [same survey](https://arxiv.org/pdf/2503.16419v4)

### Inferences
- **Per task is the right metric, and per token can mislead in both directions.** Opus 5.5 vs GPT-6 Astra: about 1 point apart in score, about 4.4x apart in tokens per task, and 1.6x apart in cost per task. Opus 5.5 max still costs about 1.6x Astra despite lower per-token pricing. Opus 5.5 vs Opus 5 shows a 20% per-token price cut fully eaten by 1.6x more tokens. A 1000x goal should be stated as "cost per solved task at quality Q", with a fixed task suite (e.g., AA Index v5 tasks) and a stated quality target.
- Headroom from reasoning efficiency at the frontier: the 4.4x token spread between comparably scoring frontier models is an existence proof of roughly 2-4x tokens-per-task savings without quality loss. Research methods add about 2x (-45 to -60% length at ±3 points), though mostly on 1-4B models and math.
- Effort control is the biggest single dial: Opus 5.5 low vs max is 10x cost for 23 points, and GPT-6.1 Sol reaches -4 points at 1/8 the cost. Adaptive per-query effort, spending tokens only where they move accuracy, plausibly captures most of this.
- Trend tension: agentic tasks are pushing tokens per task up (+69% median in one index revision), while cost at fixed capability falls about 13x per year. The 1000x target at fixed quality is about 2.7 years of the historical trend (13^2.7 ≈ 1000). This trend combines all levers (distillation, smaller models plus reasoning, hardware, price competition), so it is not independent evidence for any single lever.
- Compounding: reducing tokens per task multiplies cleanly with cost per token (quantization, MoE, hardware), because they act on different factors of cost per task. Interaction to watch: fewer, shorter sequences mean smaller effective batches and shorter KV caches. This reduces the benefit of KV-cache-oriented optimizations (MagicDec-style speculation) but helps long-context memory costs.

### Gaps
- Per-model output-token totals for all AA v5 models were not available in the text (only the median and four Claude/GPT figures).
- Token-efficiency results for frontier-scale models (more than 100B) on agentic tasks are scarce. Most measured reductions are on 1.5B-4B models and math.
- No Epoch data series on tokens per task over time was found. Epoch explicitly does not quantify it.
- No numbers were retrieved for Claude/GPT "adaptive thinking" products beyond effort-level spreads.

---

## Q4. Smaller model with more test-time compute vs larger model with less

### Takeaway
For problems a small model can sometimes solve, FLOPs-matched test-time compute beats scaling parameters. The headline results are outperforming a 14x larger model (Snell et al., 2024) and a 1B/3B model with compute-optimal search beating a 405B model on MATH-500/AIME24 (2025). The advantage disappears on hard problems, where the small model's base success rate is near zero. In the 2026 market, "mid-tier model at max effort" frequently dominates "frontier model at low effort" on cost per task.

### Cited Findings
- **Snell et al. (Aug 2024; ICLR 2025, older):** compute-optimal allocation of test-time compute improves efficiency by more than 4x over best-of-N. In a FLOPs-matched evaluation, on problems where a smaller base model has non-trivial success rates, test-time compute can outperform a **14x larger model**. Pretraining compute remains better for the hardest problems. | [arXiv 2408.03314](https://arxiv.org/html/2408.03314v1)
- **"Can 1B LLM surpass 405B?" (Feb 2025):** with compute-optimal test-time scaling (PRM-guided search), a 1B model beats a 405B model on MATH-500. 0.5B beats GPT-4o, 3B beats 405B, and 7B beats o1 and DeepSeek-R1 on MATH-500 and AIME24. The optimal strategy depends heavily on policy model, PRM and difficulty. The large models used only standard CoT. | [Emergent Mind summary of arXiv 2502.06703](https://www.emergentmind.com/papers/2502.06703)
- Market evidence (Oct 2026):
  - GPT-6.1 Sol (max) scores 55 at $1.27 per task vs Opus 5.5 (max) at 58 for $10.04.
  - Opus 5.5 (low) scores 35 at $0.98 vs Claude Haiku 5.5 (max) at 36.
  - So a small model at max effort roughly equals a large model at low effort on the index. | [Artificial Analysis v5](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5)
- Epoch: reasoning lets smaller, cheaper underlying models reach good performance, which drives the 13x-per-year decline. | [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)
- Mercury 2 replaced Claude Opus 4.7 in a compaction subagent: -90% cost and -82% latency at the same quality on that narrow task. | [Decrypt](https://decrypt.co/371722/inception-labs-mercury-2-ai-beats-googles-diffusiongemma)

### Inferences
- In a 1000x-cheaper design, "small model + adaptive test-time compute + verifier/PRM" is a legitimate lever worth an order of magnitude on cost per task for the share of tasks within the small model's reach. Routing (easy queries to small/low effort, hard to big/high effort) is what makes it compound. It does not replace scale on the hardest tasks (Snell's caveat).
- Test-time compute increases tokens per task, so its benefit only shows in cost-per-task accounting, which is another reason per-token metrics are wrong for this project.
- Small-model test-time compute pairs naturally with fast decoders. Diffusion, speculation and MTP make sampling 5-10x more tokens per task tolerable on latency, though not cheaper on FLOPs at large batch.
- Summary of multipliers for the 1000x design (indicative; ranges from the findings above):
  - Speculative decoding / MTP: 2-6.5x latency at bs=1; 1.2-1.4x throughput at bs≈64; 1.6-1.85x per-user speed at matched throughput (DSpark); 1.3-2.5x energy at bs=1, ≤1x for weak drafters. Mostly **non-compounding** with quantization or large batch.
  - Diffusion LLMs: 5-15x per-user speed; per-token cost roughly 1-2x by price evidence; quality deficit of 10-20 points on reasoning in same-lab comparisons. Overlaps with speculation.
  - Token-efficient reasoning: about 2x (research) up to about 4x (frontier spread) on tokens per task at roughly equal quality. **Compounds** with cost-per-token levers.
  - Effort/model routing and small model + test-time compute: 8-10x cost per task for -4 points (GPT-6.1 Sol vs Opus 5.5 max), and up to a 14x parameter-equivalent on medium-difficulty problems. **Compounds**, but bounded by the hard-task fraction.
  - Historical all-levers trend: about 13x per year at fixed capability. 1000x is about 2.7 years of trend if it continues.

### Gaps
- No 2026 frontier-scale FLOPs-matched study (e.g., a 30B model with heavy test-time compute vs a 1T model with light compute on agentic tasks) was found.
- No measurements of verifier/PRM overhead in production cost per task.
- No study was found that measures interaction effects (e.g., speculation gains on quantized MoE at large batch, or dLLM plus reasoning-length reduction) in one controlled setup. Compounding claims above are inferences.
