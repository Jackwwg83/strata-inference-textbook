/* Pure numbers behind the chapter 09 widgets. Teaching models, not Strata kernels.
   The order (decay, predict, delta, rank-one write, read) follows include/strata/kernels/gdn.hpp;
   the sizes follow include/strata/core/layout.hpp and gdn_state_floats in src/core/session.cpp. */
(function (root) {
  'use strict';
  const S_DIM = 128, H_V = 48, CONV_CH = 10240, D_CONV = 4, GDN_LAYERS = 36;

  // outer(k, v)[i][j] = k[i] * v[j]
  const outer = (k, v) => k.map(ki => v.map(vj => ki * vj));
  // read(S, q)[j] = sum_i S[i][j] * q[i], i.e. S^T q
  const read = (S, q) => S[0].map((_, j) => S.reduce((a, row, i) => a + row[j] * q[i], 0));
  const scale = (S, a) => S.map(row => row.map(x => x * a));

  // One gated delta-rule step: decay, predict, correct, write.
  function deltaStep(S, k, v, beta, alpha) {
    if (k.length !== S.length || v.length !== S[0].length) throw new Error('键、值的长度要和状态矩阵对上');
    const Sbar = scale(S, alpha);
    const vhat = read(Sbar, k);
    const delta = v.map((x, j) => beta * (x - vhat[j]));
    const next = Sbar.map((row, i) => row.map((x, j) => x + k[i] * delta[j]));
    return { Sbar, vhat, delta, S: next };
  }
  // The plain additive write, for comparison: decay, then add k v^T.
  function hebbStep(S, k, v, alpha) {
    const Sbar = scale(S, alpha);
    return Sbar.map((row, i) => row.map((x, j) => x + k[i] * v[j]));
  }

  // The same step with every quantity a single number. `order` is 'decay-first' (the contract) or 'write-first'.
  function scalarStep({ S, alpha, k, v, beta, q }, order) {
    if (order === 'decay-first') {
      const Sbar = alpha * S, vhat = Sbar * k, delta = beta * (v - vhat), S2 = Sbar + k * delta;
      return { Sbar, vhat, delta, S: S2, o: S2 * q };
    }
    if (order === 'write-first') {
      const vhat = S * k, delta = beta * (v - vhat), Sw = S + k * delta, S2 = alpha * Sw;
      return { vhat, delta, Sw, S: S2, o: S2 * q };
    }
    throw new Error('order 只能是 decay-first 或 write-first');
  }

  const stateBytesPerLayer = () => S_DIM * H_V * S_DIM * 4;
  const convBytesPerLayer = () => CONV_CH * (D_CONV - 1) * 4;
  const gdnBytesTotal = () => GDN_LAYERS * (stateBytesPerLayer() + convBytesPerLayer());

  const api = { S_DIM, H_V, GDN_LAYERS, outer, read, deltaStep, hebbStep, scalarStep, stateBytesPerLayer, convBytesPerLayer, gdnBytesTotal };
  root.VizMath = root.VizMath || {};
  root.VizMath.gdn = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
