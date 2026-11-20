import numpy as np
rng = np.random.default_rng(0)
def adds(N, M, g, p0=0.4):
    W = rng.choice([-1,0,1], size=(M,N), p=[(1-p0)/2,p0,(1-p0)/2])
    direct = int(np.maximum((W!=0).sum(1)-1,0).sum())
    if g == 1: return direct, direct
    pre = 0; row = np.zeros(M, int)
    for k in range(N//g):
        blk = W[:, k*g:(k+1)*g]
        nz = (blk!=0).any(1); row += nz
        # canonicalize sign by first nonzero
        first = np.where(blk!=0, blk, 0)
        s = np.array([r[r!=0][0] if (r!=0).any() else 1 for r in blk])
        canon = blk * s[:,None]
        uniq = {tuple(r) for r in canon[nz]}
        pre += sum(max(sum(1 for v in u if v)-1,0) for u in uniq)
    return direct, pre + int(np.maximum(row-1,0).sum())
for (N,M) in [(48,64),(48,256),(1024,1024),(4096,4096)]:
    out=[]
    for g in [1,3,4,5,6,7,8]:
        if g>1 and N>=4096 and g>7: continue
        d,s = adds(N,M,g); out.append(f"g{g}:{d/s:.2f}x")
    print(N,M," ".join(out))

