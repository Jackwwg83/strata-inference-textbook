/* Pure numbers behind the chapter 03 widgets: dot products, matrix-vector products and strided addressing.
   The 3-D example mirrors the GDN state axes (i, h, j) of include/strata/kernels/gdn.hpp at a toy size. */
(function (root) {
  'use strict';
  function dot(a, b) {
    if (a.length !== b.length) throw new Error('两个向量长度不同，不能做点积');
    return a.reduce((s, x, k) => s + x * b[k], 0);
  }
  function matvec(W, x) { return W.map(row => dot(row, x)); }
  // X is a list of input columns; the result is the list of output columns.
  function matmulCols(W, X) { return X.map(x => matvec(W, x)); }
  // m x d weights applied to b inputs: multiply-adds, weights read once, uses per weight read.
  function cost(m, d, b) { return { macs: m * d * b, weights: m * d, reuse: b }; }

  // order lists the axes from slowest (outermost) to fastest (innermost); strides are in elements.
  function strides(shape, order) {
    const s = {};
    let step = 1;
    for (let k = order.length - 1; k >= 0; k--) { s[order[k]] = step; step *= shape[order[k]]; }
    return s;
  }
  function offset(index, shape, order) {
    const s = strides(shape, order);
    return order.reduce((sum, a) => {
      if (!(index[a] >= 0 && index[a] < shape[a])) throw new Error('坐标越界：' + a);
      return sum + index[a] * s[a];
    }, 0);
  }
  const elements = shape => Object.values(shape).reduce((a, b) => a * b, 1);

  const api = { dot, matvec, matmulCols, cost, strides, offset, elements };
  root.VizMath = root.VizMath || {};
  root.VizMath.tensor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
