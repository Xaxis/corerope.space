# Capability Density, Distillation, and Inference Cost Trends for LLMs (as of Nov 2026)

## Q1. How fast has the price of a fixed capability level fallen? (Epoch AI, a16z, MIT/Epoch "Price of Progress"; latest 2025/2026 figures)

### Takeaway
Every major estimate puts the price decline at constant capability at roughly 5x to 40x per year, with the most recent and most careful estimate (Epoch, Sept 2026) at about 13x/year (47% per quarter) since 2023. Once hardware is divided out, the "algorithmic plus market" component is about 3x/year for open-weight models, with much faster but likely less durable drops right after a capability level first becomes state of the art.

### Cited Findings
**Epoch AI, "The Plunging Price of Thought" (Emberson and Roodman, published Sept 22, 2026). This is the newest headline figure.**
- Across five primary benchmarks (math, science, games), the cost of a given performance level fell about 47% per quarter since 2023, roughly 13x per year. Coarser MMLU-based evidence suggests a similar pace back to the start of commercial LLM inference in Nov 2021. Source: [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)
- Per-benchmark quarterly declines: AIME (OTIS Mock) 47.1%, Chess Puzzles 43.0%, FrontierMath T1-3 53.1%, GPQA Diamond 47.0%, Mystery Game Puzzles 44.0%. Math domains run at about 16-19x/year, game puzzles at about 7-10x/year. Source: [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)
- At the moment a level first becomes SOTA, cost falls about 66% per quarter (about 75x/year). Two years later the rate is about 32% per quarter (about 4.7x/year). Source: [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)
- Example: about 75% on GPQA Diamond cost about $0.30 per question with o3 (Jan 2025). GPT-5.6 Luna matched it for $0.0004 per question in mid-2026, a drop the report puts at 725x in under 18 months. (The raw ratio of the two prices is about 750x, so the headline is approximate.). Source: [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought); [Marginal Revolution summary](https://marginalrevolution.com/marginalrevolution/2026/09/the-price-of-intelligence-is-falling.html)
- Comparison with other technologies: LLM inference about 13x/yr, DNA sequencing (2001-2025) 1.84x/yr, compute (1940-2001) 1.51x/yr, Li-ion batteries 1.16x/yr, US residential electricity (1892-1973) 1.05x/yr. Source: [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)
- Caveats from the report: it does not split the decline into hardware, algorithm and margin effects. It reports no standard errors. It is sensitive to benchmaxxing (Mystery Game Puzzles, which hides its game, declines more slowly). It assumes an idealized user who always picks the cheapest adequate model. Open-weight costs were estimated from rented hardware, with a discrepancy under 30% against API prices. Source: [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)

**Gundlach et al., "The Price of Progress: Algorithmic Efficiency and the Falling Cost of AI Inference" (arXiv 2511.23455, Nov 2025; MIT FutureTech with Epoch data). This is the best available decomposition.**
- Pareto-frontier annual price reduction at fixed performance: GPQA-Diamond 5.32x/yr (90% CI 2.45-11.53, n=53). Open-weight only: 4.60x. AIME 11.66x (CI 5.25-25.91). Open-weight AIME 4.68x. SWE-bench Verified 4.68x, but the CI of 0.68-32.16 (n=13) includes no progress. Source: [arXiv 2511.23455](https://arxiv.org/html/2511.23455v1)
- Headline: frontier prices at a given performance level fell about 5-10x per year. Source: [arXiv 2511.23455](https://arxiv.org/html/2511.23455v1)
- Using all models rather than only the Pareto frontier gives roughly half the rates: GPQA-D 3.77x for all licenses and 1.21x for open-weight. Source: [arXiv 2511.23455](https://arxiv.org/html/2511.23455v1)
- By GPQA-D performance bin: about 31x/yr in the highest bin and about 1.7x/yr in the lowest bin. Source: [arXiv 2511.23455](https://arxiv.org/html/2511.23455v1)
- Decomposition: the authors assume about 30%/yr hardware price-performance gain (citing Rahman 2024) and divide it out. That leaves algorithmic efficiency at about 3x/yr, estimated from open-weight models. Hardware-adjusted values: GPQA-D Pareto open-weight 3.22x (CI 1.54-6.75), AIME open-weight 3.28x, GPQA-D all licenses 3.72x. Source: [arXiv 2511.23455](https://arxiv.org/html/2511.23455v1)
- Cross-check cited in the paper: Saad-Falcon et al. (2025) find about 3.1x energy-efficiency gains from 2023 to 2025 after controlling for hardware. Source: [arXiv 2511.23455](https://arxiv.org/html/2511.23455v1)
- Per-benchmark evaluation cost stayed flat or rose despite falling price-performance, because of reasoning-token growth. Some SWE-V runs now cost thousands of dollars. Source: [arXiv 2511.23455](https://arxiv.org/html/2511.23455v1)
- Data: Artificial Analysis prices from Internet Archive snapshots (cheapest provider), plus Epoch Benchmarking Hub token counts, covering April 2024 to Oct/Nov 2025. The paper is internally inconsistent on the end date. Source: [arXiv 2511.23455](https://arxiv.org/html/2511.23455v1)
- Note: in our reading, the Table 2 (hardware-adjusted) values are about 1.43x smaller than Table 1 everywhere. That implies a hardware divisor near 43%/yr, not the 30% stated in the text. Source: [arXiv 2511.23455](https://arxiv.org/html/2511.23455v1)

**Epoch AI Data Insight, "LLM inference prices have fallen rapidly but unequally across tasks" (Mar 12, 2025; older).**
- The price to reach GPT-4's GPQA Diamond performance fell about 40x per year. Across thresholds, rates range from 9x to 900x per year, and the fastest declines are the most recent. Source: [Epoch AI](https://epoch.ai/blog/llm-inference-price-trends)
- MMLU GPT-4 level (86-88): GPT-4-0314 at $37.50/M tokens (Mar 2023) vs. Gemini 2.0 Flash at $0.18/M (Feb 2025), about 208x in 23 months. GPQA 53: GPT-4o at $7.50/M vs. Phi-4 (Dec 2024) at $0.12/M. MMLU GPT-3.5 level (~68): GPT-3.5 Turbo at $2.00/M vs. Gemini-1.5-Flash-8B (Oct 2024) at $0.07/M. Source: [Epoch AI](https://epoch.ai/blog/llm-inference-price-trends)

**a16z, "Welcome to LLMflation" (Guido Appenzeller, Nov 12, 2024; older).**
- For an LLM of equivalent performance, cost is falling about 10x per year. Source: [a16z](https://a16z.com/llmflation-llm-inference-cost/)
- MMLU ≥42: GPT-3 at $60/M (Nov 2021) vs. Llama 3.2 3B on Together at $0.06/M, about 1000x in 3 years. MMLU ≥83: about 62x decline since GPT-4 (Mar 2023). Source: [a16z](https://a16z.com/llmflation-llm-inference-cost/)
- Drivers are listed but not quantified, except quantization (16-bit to 4-bit, "at least 4x"). The others are hardware, software, smaller overtrained models, RLHF/DPO, and open-source provider competition. Source: [a16z](https://a16z.com/llmflation-llm-inference-cost/)

**Epoch Gradient Update, "How persistent is the inference cost burden?" (Feb 16, 2026).**
- Restates 5-10x/yr. On FrontierMath (~27%), o4-mini high (Apr 2025) used about 43M output tokens vs. GPT-5.2 low (Dec 2025) about 5M. After adjusting for price, that is about a 3x cost cut in 8 months, partly from more concise reasoning. Source: [Epoch AI](https://epoch.ai/gradient-updates/how-persistent-is-the-inference-cost-burden)
- Warns that the trend may be overstated because distilled models score disproportionately well on benchmarks and seem more brittle. It also says the decline may slow once models get too small for strong general agentic capability. Source: [Epoch AI](https://epoch.ai/gradient-updates/how-persistent-is-the-inference-cost-burden)

### Inferences
- A reasonable central range for planning is about 10x/yr at constant capability. Of that, about 1.3-1.4x/yr is hardware, about 3x/yr is algorithmic/model-side (from open-weight, hardware-adjusted data), and the rest is margin compression and competition. The remainder is most visible in closed models and right after a SOTA level appears.
- At a constant 10x/yr, a "1000x cheaper at comparable quality" target is roughly what the market already delivers in about 3 years for a fixed capability (a16z's GPT-3 → Llama 3.2 3B example is exactly 1000x in 3 years). The hard part is getting 1000x against the *current* frontier, not against a 2-3-year-old one.
- Much of the headline decline is price (margins) and benchmark targeting, not cost. The ~3x/yr algorithmic figure is the more defensible "technical" multiplier.

### Gaps
- No source gives a rigorous three-way split (model density vs. hardware vs. serving software). The Price of Progress paper only separates hardware from everything else.
- Artificial Analysis's own price-vs-intelligence trend charts could not be retrieved (fetch blocked), so there are no AA-native 2026 frontier-price numbers here.

## Q2. Densing law: capability density doubling time and follow-ups

### Takeaway
Tsinghua/OpenBMB's densing law finds that the maximum capability per parameter of open models doubles about every 3.3-3.5 months (about 3.5 months in the Nature Machine Intelligence version, covering Feb 2023-Apr 2025). Measured inference cost for a fixed capability halved about every 2.6 months.

### Cited Findings
- arXiv v2: ln(ρ_max) = A·t + B, with maximum density doubling about every 3.3 months (A ≈ 0.007, R² ≈ 0.93). An alternative fit gives about 95 days. Based on 29 open base models (Llama, Falcon, MPT, Phi, Mistral, StableLM, TinyLlama, MiniCPM) on MMLU, BBH, MATH, HumanEval and MBPP, with Llama-1 (Feb 2023) as the origin. Source: [arXiv 2412.04315v2](https://arxiv.org/html/2412.04315v2)
- Definition: density = (parameters of a reference model achieving equal performance) / (actual parameters). Llama-1 has density below 0.1. Gemma-2-9B and MiniCPM-3-4B reach about 3. Llama-3.1-405B is not among the densest models. Source: [arXiv 2412.04315v2](https://arxiv.org/html/2412.04315v2)
- Cost for GPT-3.5-level performance fell from $20/M tokens (Dec 2022) to $0.075 (Gemini-1.5-Flash, Aug 2024), a 266.7x drop, halving about every 2.6 months. This is faster than the density gain because infrastructure gains also contribute. Source: [arXiv 2412.04315v2](https://arxiv.org/html/2412.04315v2)
- MMLU slope before ChatGPT was A ≈ 0.0048 and after was A ≈ 0.0073, about 50% faster density growth after ChatGPT. Source: [arXiv 2412.04315v2](https://arxiv.org/html/2412.04315v2)
- Combining density growth with a 2.1-year doubling of chip compute per price gives about an 88-day doubling of the "effective parameter size" that fits on a fixed-price chip. Source: [arXiv 2412.04315v2](https://arxiv.org/html/2412.04315v2)
- Published Version: cover article of *Nature Machine Intelligence* (Nov 20 issue, per Tsinghua; the year is presumably 2025 but is not stated on the page). It applies the method to 51 open models from Feb 2023 to Apr 2025 and finds a doubling time of about 3.5 months. Source: [Tsinghua University](https://www.tsinghua.edu.cn/en/info/1245/14611.htm)
- Compression results: only Gemma-2-9B (distilled from Gemma-2-27B) has higher density than its source. Llama-3.2-3B/1B, Llama-3.1-Minitron-4B (pruned and distilled from 8B) and Gemma-2-2B have *lower* density than their originals, which the authors attribute to insufficient training. Quantization was not evaluated. Source: [arXiv 2412.04315v2](https://arxiv.org/html/2412.04315v2)
- Caveats: base models only (no instruction tuning or inference-time compute), reference-model dependence, benchmark contamination risk, and saturation. Source: [arXiv 2412.04315v2](https://arxiv.org/html/2412.04315v2)

### Inferences
- A 3.3-3.5-month doubling is about 10-12x per year in parameters needed for fixed benchmark scores. That roughly matches the ~10x/yr price trend, but it measures envelope (max) models on saturating, contamination-prone benchmarks.
- Naive pruning and distillation often *lose* density. Density gains come mostly from better data and longer training of small models, not from compressing big ones after the fact.

### Gaps
- I found no independent replication of the densing law after Apr 2025, and no 2026 update extending the series through Qwen3.5 or Gemma 4.

## Q3. Best small models in 2026 and what fraction of frontier capability they reach

### Takeaway
In 2026, sub-10B dense models such as Qwen3.5-9B/4B (Mar 2026) reach about a third of the Artificial Analysis Intelligence Index of top models. They run on a single consumer GPU about 6-12 months behind the frontier. Their clear weaknesses are factual knowledge (80%+ hallucination rates) and token inefficiency: they use 2-4x more output tokens than frontier models for the same eval.

### Cited Findings
- Qwen3.5 small series (dense, reasoning, Apache 2.0, 262K context, native vision; covered by AA on Mar 5, 2026): AA Intelligence Index 9B = 32, 4B = 27, 2B = 16, 0.8B = 9. Predecessors scored Qwen3-VL-8B = 17 and Qwen3-4B-2507 = 18. Other sub-10B models: Falcon-H1R-7B = 16, Nemotron Nano 9B v2 = 15. Source: [Artificial Analysis](https://artificialanalysis.ai/articles/qwen3-5-small-models)
- Token usage to run the AA Index: Qwen3.5 2B ~390M, 4B ~240M, 9B ~260M output tokens. By comparison, Qwen3.5-27B used 98M, Qwen3.5-397B 86M, GPT-5.1 high 69M, Gemini 3.1 Pro Preview 57M, GLM-5 109M, and GPT-5.2 Codex xhigh 202M. Source: [Artificial Analysis](https://artificialanalysis.ai/articles/qwen3-5-small-models)
- Knowledge: on AA-Omniscience, Qwen3.5-4B has 12.8% accuracy and an 80% hallucination rate; 9B has 14.7% and 82%. Their improvement over Qwen3 came mostly from lower hallucination, not higher accuracy. Source: [Artificial Analysis](https://artificialanalysis.ai/articles/qwen3-5-small-models)
- Memory at 4-bit: 9B about 6GB, 4B about 3GB. Source: [Artificial Analysis](https://artificialanalysis.ai/articles/qwen3-5-small-models)
- The best open models that run on a single consumer GPU (RTX 5090) match frontier performance with an average lag of 6-12 months, consistent with Epoch's earlier 5-22-month lag for open models of any size. The sample spans about 4B (Hunyuan 4B) to 33B (Qwen3-32B, QwQ-32B) and includes gpt-oss-20B. This is dated Aug 2025, with data updated Nov 2025. Epoch cautions that small models are "more likely to be optimized for specific benchmarks.". Source: [Epoch AI](https://epoch.ai/data-insights/consumer-gpu-model-gap)
- Frontier-distilled reasoning (Jan 2025; older): DeepSeek-R1-Distill-Qwen-32B scored AIME 2024 72.6%, MATH-500 94.3%, GPQA-D 62.1% and LiveCodeBench 57.2%, beating o1-mini on everything but Codeforces. Direct RL on Qwen-32B reached only 47.0% on AIME, vs. 72.6% from distillation. Source: [Emergent Mind summary of DeepSeek-R1 paper](https://www.emergentmind.com/topics/deepseek-r1-distill-qwen-32b); [DeepSeek-R1 paper](https://arxiv.org/pdf/2501.12948)
- Earlier SOTA-small examples used as price anchors: Phi-4 (Dec 2024) matched GPT-4o's GPQA 53 at $0.12/M vs. $7.50/M. Source: [Epoch AI](https://epoch.ai/blog/llm-inference-price-trends)

### Inferences
- Small models close the gap fastest on reasoning benchmarks with verifiable answers (math, GPQA, code puzzles), which are exactly the domains where distillation and RL transfer well. They lag badly on long-tail factual recall, which is consistent with a parameter-bound knowledge capacity (see Q4).
- Token inefficiency partly offsets the per-token saving. A 9B model using about 4x the tokens of a frontier model loses about 4x of its per-token cost advantage per task. Any "1000x cheaper" target should be stated per task, not per token.

### Gaps
- Gemma 4 (released around Apr 2026, Apache 2.0), Phi-4 successors, SmolLM3, and small Llama 2026 numbers could not be verified: the AA Gemma 4 article was not fetchable. No measured data here.
- I found no quantified 2026 data on small-model performance on long-horizon agentic benchmarks (e.g., Terminal-Bench, tau-bench) relative to frontier models.

## Q4. Limits of distillation: is the student capped at the teacher, and is knowledge storage bounded per parameter?

### Takeaway
Knowledge storage is roughly bounded at about 2 bits per parameter (8-bit weights preserve this; 4-bit roughly halves it or worse). That sets a hard floor on how small a model can be while still holding frontier-level factual knowledge. Distillation has a capacity gap beyond which a better teacher stops helping. Students can sometimes exceed teachers, but distillation only beats plain pretraining when the teacher's cost is amortized.

### Cited Findings
- Physics of Language Models Part 3.3 (Allen-Zhu and Li, ICLR 2025; arXiv Apr 2024): language models store about 2 bits of knowledge per parameter after about 1000 exposures, across architectures. No model exceeded 2.3. A 7B model could store about 14B bits. Source: [HF Papers](https://huggingface.co/papers/2404.05405.md); [ICLR 2025](https://proceedings.iclr.cc/paper_files/paper/2025/hash/26d3c9a66836ded8f34a944f2bfe868e-Abstract-Conference.html)
- At 100 exposures, capacity falls to about 1 bit/param. Source: [HF Papers](https://huggingface.co/papers/2404.05405.md)
- Quantization: int8 shows no measurable capacity loss. int4 drops it sharply: the intro cites about 0.7 bit/param, while the body says "more than 2x" loss. Source: [HF Papers](https://huggingface.co/papers/2404.05405.md)
- MoE: a 32-expert MoE has about 1.3x lower capacity per *total* parameter (1.5x at 100 exposures), while using only about 8.8% of parameters at inference. Source: [HF Papers](https://huggingface.co/papers/2404.05405.md)
- Junk data: if 7/8 of tokens are junk, useful-knowledge capacity can fall by up to 20x at 100 exposures. Prepending a domain token cuts this loss to about 2x. Gated MLP (LLaMA/Mistral style) trails GPT-2 by up to 1.3x at 100 exposures. Source: [HF Papers](https://huggingface.co/papers/2404.05405.md)
- Experiments cover GPT-2-style models of about 1M-0.5B params on synthetic biography data. Source: [HF Papers](https://huggingface.co/papers/2404.05405.md)
- Distillation Scaling Laws (Busbridge et al., Apple, ICML 2025): when a teacher already exists or many students will be made, distillation beats supervised pretraining up to a compute level that scales with student size. If one student is distilled and the teacher must also be trained, supervised learning is generally preferable. Lower teacher cross-entropy helps only "until the capacity gap." A student *can* outperform its teacher. The law was fitted on high-cross-entropy students; low-cross-entropy predictions are extrapolations. Source: [Apple ML Research](https://machinelearning.apple.com/research/distillation-scaling-laws); [arXiv 2502.08606](https://arxiv.org/abs/2502.08606)
- A related "law of capacity gap" paper (ACL 2025) studies the optimal teacher-student size ratio. Not fetched; existence noted only. Source: [ACL Anthology](https://aclanthology.org/2025.acl-long.1097)

### Inferences
- Rough floor: if a frontier model holds on the order of 10^12-10^13 bits of usable facts (an assumption; no source found), then at 2 bits/param it needs about 0.5-5T params' worth of storage. That cannot be distilled into a 9B model. So "comparable quality" at 1000x lower cost must either move knowledge outside the weights (retrieval, tools) or use sparse/MoE storage, where total params are large but active params are small.
- int8 is "free" for knowledge, while int4 is not. Gains from aggressive weight quantization are bounded by knowledge capacity, especially for knowledge-dense small models.
- MoE is favorable here: a 1.3-1.5x loss in bits per total param, in exchange for about 11x fewer active params.

### Gaps
- No measured estimate of the total knowledge content (in bits) of a frontier model.
- The Physics of LM results are on synthetic data at sub-1B scale. I found no frontier-scale validation of the 2 bits/param ratio.

## Q5. Evidence on compounding or overlap of compression methods

### Takeaway
Compression methods compound in size but with diminishing and sometimes destructive interactions. Order matters a lot (quantize last). Post-hoc pruning and distillation often reduce density relative to well-trained small models. There is little rigorous evidence that the multipliers of quantization, distillation and MoE simply multiply at constant quality.

### Cited Findings
- Systematic Study of Compression Ordering (arXiv 2511.19495, Nov 2025; Qwen2.5 3B/7B, ambiguous in the paper): KD + 30% FFN structured pruning + 4-bit BnB quantization. Singly: quantization 3.00x size reduction (PPL 3.418→3.955), pruning 1.31x (PPL→5.086), and KD has no size effect (PPL 3.226). All three combined give only 3.68x. The best order, P→KD→Q, keeps about 88% of base G-Eval with PPL +48%. Source: [arXiv 2511.19495](https://arxiv.org/html/2511.19495v1)
- Quantizing first is catastrophic: KD-Q-P PPL 53.4 and Q-P-KD PPL 34.5, with G-Eval falling to 0.06-0.15. The authors attribute this to information lost in quantize/dequantize corrupting later training. Source: [arXiv 2511.19495](https://arxiv.org/html/2511.19495v1)
- Densing law: pruned-and-distilled models (Llama-3.1-Minitron-4B, Llama-3.2-1B/3B) end up with lower capability density than their parents. Only Gemma-2-9B, distilled from 27B, beat its parent's density. Source: [arXiv 2412.04315v2](https://arxiv.org/html/2412.04315v2)
- Knowledge capacity: int4 cuts bits/param by more than 2x, and MoE costs about 1.3x per total param. These quantify how quantization and sparsity overlap on knowledge storage. Source: [HF Papers](https://huggingface.co/papers/2404.05405.md)
- Serving-side compounding (SemiAnalysis InferenceMAX, Oct 2025): multi-token prediction gives 2-3x interactivity at equal cost. GB200 NVL72 FP4 delivers about 8x the tokens per MW of a single-node H200 FP8 on DeepSeek-R1 at 30 tok/s/user. For gpt-oss-120B, H100 does 0.9M tok/s/MW vs. B200 FP4 2.8M (about 3x; about 7x at 180 tok/s/user). These bundle hardware, precision (FP8→FP4) and software, so they are not separable. Source: [SemiAnalysis](https://newsletter.semianalysis.com/p/inferencemax-open-source-inference)
- a16z estimated at least 4x from 16-bit to 4-bit inference. Source: [a16z](https://a16z.com/llmflation-llm-inference-cost/)

### Inferences
- Model-level techniques (distill, prune, quantize) overlap because they all spend the same "redundancy budget." Serving-level techniques (batching, MTP/speculative decoding, KV-cache tricks) and hardware (FP4, NVL72) are more orthogonal and closer to multiplicative.
- A 1000x plan should probably budget about 3x from a precision step (BF16→FP4/INT4 with quantization-aware training), about 10x from active-parameter reduction (MoE sparsity), 2-3x from speculative/MTP decoding, and a few x from hardware generation. It should assume each pairwise combination loses some of the product. This is a planning heuristic, not a measured result.

### Gaps
- I found no rigorous large-scale (>30B) study measuring quality-matched compounding of MoE + distillation + low-bit quantization + speculative decoding together.
- I found no quantified same-hardware software-improvement rate (e.g., % per quarter on H100 from vLLM/SGLang/TRT-LLM releases). InferenceMAX tracks this nightly, but the public article gives no rate.

## Q6. How should the baseline be defined (e.g., cost per token of a frontier dense model on H100s in 2024)?

### Takeaway
No single measured "frontier dense on H100" $/token figure is publicly clean. The best-documented anchors are list prices: GPT-4-0314 at $37.50/M blended tokens (Mar 2023), and per-question costs on fixed benchmarks (e.g., o3 at about $0.30 per GPQA question, Jan 2025). A hardware-level anchor is H100 throughput per MW from InferenceMAX.

### Cited Findings
- GPT-4-0314 list price was $37.50/M tokens in Mar 2023. GPT-4o was $7.50/M in May 2024. Source: [Epoch AI](https://epoch.ai/blog/llm-inference-price-trends)
- GPT-3 launch price was $60/M (Nov 2021). o1's output price was also $60/M. Source: [a16z](https://a16z.com/llmflation-llm-inference-cost/)
- o3 (Jan 2025) cost about $0.30 per question at about 75% GPQA Diamond. Source: [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)
- Llama 3.1 405B (the largest open dense frontier-class model of 2024) no longer has any API provider tracked by Artificial Analysis, so a current market price is unavailable. Source: [Artificial Analysis](https://artificialanalysis.ai/models/llama-3-1-instruct-405b/providers)
- InferenceMAX: H100 delivers about 900,000 tok/s per provisioned MW on gpt-oss-120B (MX4, 90 tok/s/user). Electricity and colocation are under 20% of TCO, and hardware vendor gross margin (under 50% to 75%) is the biggest TCO driver. Source: [SemiAnalysis](https://newsletter.semianalysis.com/p/inferencemax-open-source-inference)
- Epoch's own method estimates open-weight cost from rented hardware, matching API prices to within 30%. Source: [Epoch AI](https://epoch.ai/publications/the-plunging-price-of-thought)

### Inferences
- Recommended baseline: a 2024-era dense ~400B-class model (e.g., Llama 3.1 405B, BF16/FP8 on 8xH100), measured as **cost per task at fixed quality** (e.g., $ per GPQA-D question or per SWE-bench task) on rented H100 hours. This avoids per-token comparisons, which small reasoning models game by emitting 2-4x more tokens, and margin noise in list prices.
- Report two variants: (a) the frontier as of 2024, which the 10x/yr trend says is already about 100x cheaper by late 2026 for the same capability; (b) the late-2026 frontier, so the "1000x" claim is not mostly absorbed by two years of market trend.

### Gaps
- No measured $/M-token figure for Llama 3.1 405B on H100 was retrieved (AA shows no current providers, and the SemiAnalysis dollar TCO figures are paywalled).
- Rented H100 $/GPU-hour for 2024 vs. 2026 was not retrieved.
