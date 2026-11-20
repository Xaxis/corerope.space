# Ternary hardwired layer with shared partial-sum wiring (SPW):
# split inputs into groups of g; build each signed combination used by any row ONCE; rows add one term per group.
import numpy as np, sys
kind, N, M, abits, g = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
rng = np.random.default_rng(0)
W = rng.choice([-1,0,1], size=(M,N), p=[0.3,0.4,0.3])
ob = abits + int(np.ceil(np.log2(N))) + 2
L = [f"module top(input signed [{N*abits-1}:0] xin, output signed [{M*ob-1}:0] yout);"]
for i in range(N):
    L.append(f"  wire signed [{abits-1}:0] x{i} = xin[{(i+1)*abits-1}:{i*abits}];")
if kind == 'direct':
    for j in range(M):
        t = [("+ " if W[j,i]>0 else "- ")+f"x{i}" for i in range(N) if W[j,i]!=0]
        e = " ".join(t) or "0"; e = e[2:] if e.startswith("+ ") else e
        L.append(f"  assign yout[{(j+1)*ob-1}:{j*ob}] = {e};")
else:
    G = N//g; pb = abits + int(np.ceil(np.log2(g))) + 1
    nsums = 0
    rowterms = [[] for _ in range(M)]
    for k in range(G):
        cols = list(range(k*g, (k+1)*g))
        seen = {}
        for j in range(M):
            pat = tuple(int(v) for v in W[j, cols])
            if all(v == 0 for v in pat): continue
            # canonical sign: first nonzero positive; reuse negation
            s = next(v for v in pat if v != 0)
            canon = tuple(v*s for v in pat)
            if canon not in seen:
                name = f"p{k}_{len(seen)}"; seen[canon] = name
                t = [("+ " if v>0 else "- ")+f"x{cols[q]}" for q,v in enumerate(canon) if v!=0]
                e = " ".join(t); e = e[2:] if e.startswith("+ ") else e
                L.append(f"  wire signed [{pb-1}:0] {name} = {e};"); nsums += 1
            rowterms[j].append(("+ " if s>0 else "- ") + seen[canon])
    for j in range(M):
        e = " ".join(rowterms[j]) or "0"; e = e[2:] if e.startswith("+ ") else e
        L.append(f"  assign yout[{(j+1)*ob-1}:{j*ob}] = {e};")
L.append("endmodule")
open(f"{kind}_{N}x{M}_a{abits}_g{g}.v","w").write("\n".join(L))
print(f"{kind}_{N}x{M}_a{abits}_g{g}.v", int((W!=0).sum()), N*M)

