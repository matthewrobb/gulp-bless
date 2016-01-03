'use strict';

var through = require('through2');
var path = require('path');
var gutil = require('gulp-util');
var postcss = require('postcss');
var File = gutil.File;
var PluginError = gutil.PluginError;

var chunk = require('./lib/chunk');

module.exports = function(options){
  var pluginName = 'gulp-bless';

  return through.obj(function(file, enc, cb) {
    if (file.isNull()) return cb(null, file); // ignore
    if (file.isStream()) return cb(new PluginError(pluginName,  'Streaming not supported'));

    var stream = this;
    var contents;

    if (file.contents && (contents = file.contents.toString('utf8'))) {
      var fileName = path.basename(file.path, '.css');

      postcss([ chunk({ filename: fileName }) ]).process(contents).then(function(result) {

        var numSelectors = result.num_selectors;
        var blessedFiles = result.chunks;

        if (options.log) {
          // print log message
          var msg = 'Found ' + numSelectors + ' selector' + (numSelectors === 1 ? '' : 's') + ', ';
          if (blessedFiles.length > 1) {
            msg += 'splitting into ' + blessedFiles.length + ' blessedFiles.';
          } else {
            msg += 'not splitting.';
          }
          gutil.log(msg);
        }

        // write processed file(s)
        blessedFiles.forEach(function (blessedFile, idx) {
          var newName = fileName + '.part' + (idx+1) + '.css';

          var newFile = new File({
            cwd: file.cwd,
            base: file.base,
            path: path.resolve(path.dirname(file.path), newName),
            contents: new Buffer(blessedFile.css)
          });

          stream.push(newFile);
        });

        cb();
      }, function(err) {
        return cb(new PluginError(pluginName,  err));
      });
    } else {
      return cb(null, file);
    }
  });
};
