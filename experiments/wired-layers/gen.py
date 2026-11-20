import numpy as np, sys
rng = np.random.default_rng(0)
def wired(kind, N, M, abits, zero_frac=0.4):
    """y = W x with W hardwired. kind: 'ternary' or 'int4'."""
    if kind == 'ternary':
        W = rng.choice([-1,0,1], size=(M,N), p=[(1-zero_frac)/2, zero_frac, (1-zero_frac)/2])
    else:
        W = rng.integers(-8, 8, size=(M,N))
    ob = abits + 4 + int(np.ceil(np.log2(N))) + 1
    L = [f"module top(input signed [{N*abits-1}:0] xin, output signed [{M*ob-1}:0] yout);"]
    for i in range(N):
        L.append(f"  wire signed [{abits-1}:0] x{i} = xin[{(i+1)*abits-1}:{i*abits}];")
    for j in range(M):
        terms = []
        for i in range(N):
            w = int(W[j,i])
            if w == 0: continue
            if kind == 'ternary':
                terms.append(("+ " if w > 0 else "- ") + f"x{i}")
            else:
                terms.append(f"+ ({w} * x{i})")
        expr = " ".join(terms) if terms else "0"
        if expr.startswith("+ "): expr = expr[2:]
        L.append(f"  wire signed [{ob-1}:0] y{j} = {expr};")
        L.append(f"  assign yout[{(j+1)*ob-1}:{j*ob}] = y{j};")
    L.append("endmodule")
    nnz = int((W != 0).sum())
    return "\n".join(L), nnz

def mac(abits, wbits=4):
    acc = abits + wbits + 8
    return f"""module top(input signed [{wbits-1}:0] w, input signed [{abits-1}:0] x, input signed [{acc-1}:0] a, output signed [{acc-1}:0] y);
  assign y = a + w * x;
endmodule""", 1

if __name__ == "__main__":
    kind, N, M, abits = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    src, nnz = mac(abits) if kind == 'mac' else wired(kind, N, M, abits)
    open(f"{kind}_{N}x{M}_a{abits}.v", "w").write(src)
    print(nnz, N*M)

