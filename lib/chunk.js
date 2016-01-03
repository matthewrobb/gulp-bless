var postcss = require('postcss');

function getSelLength(node) {
  if (node.type === 'rule') {
    return node.selectors.length;
  }
  if (node.type === 'atrule' && node.nodes) {
    return 1 + node.nodes.reduce(function(memo, n) {
      return memo + getSelLength(n);
    }, 0);
  }
  return 0; // comment
}

module.exports = postcss.plugin('postcss-chunk', function (opts) {
  opts = opts || {};
  var size = opts.size || 4000;

  return function(css, result) {
    var plugins = result.processor.plugins;
    var chunks = [];
    var total = 0;
    var count, chunk;

    function nextChunk() {
      count = 0;
      chunk = css.clone({nodes: []});
      chunks.push(chunk);
    }

    if (plugins[plugins.length - 1].postcssPlugin !== 'postcss-chunk') {
      throw new Error('postcss-chunk must be the last processor plugin');
    }

    css.nodes.forEach(function(n) {
      var selCount = getSelLength(n);
      total += selCount;

      if (!chunk || count + selCount > size) {
        nextChunk();
      }
      chunk.append(n);
      count += selCount;
    });

    result.num_selectors = total;
    var manifest = chunks.shift();

    result.chunks = chunks.map(function(c, idx) {
      manifest.prepend(
        postcss.atRule({ name: 'import', params: [
          'url("' + opts.filename + '.part' + (idx+2) + '.css")'
        ]})
      );
      return c.toResult({ map: opts.map || false });
    });

    result.chunks.unshift(manifest.toResult({ map: opts.map || false }));
  };
});
