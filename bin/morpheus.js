#!/usr/bin/env node

var commandLineArgs = require('command-line-args');
var getUsage = require('command-line-usage');
var path = require('path');
var fs = require('fs');
var phantomjs = require('phantomjs-prebuilt');
var optionDefinitions = [
  {name: 'input', alias: 'i', type: String, description: 'JSON configuration (https://software.broadinstitute.org/morpheus/configuration.html)'},
  {name: 'output', alias: 'o', type: String, description: 'output image file'},
  {name: 'format', alias: 'f', type: String, description: 'output file format (pdf, png, svg)'},
  {name: 'port', type: Number, description: 'port for temporary web server for reading local files using PhantomJS', defaultValue: 9432},
  {name: 'help', alias: 'h', type: Boolean, description: 'print this usage guide'}
];

var commandArgs;
try {
  commandArgs = commandLineArgs(optionDefinitions);
} catch (x) {
  console.log('' + x);
  console.log(usage);
  process.exit();
}

var usage = getUsage([
  {
    header: 'morpheus',
    content: 'Generate static heat maps using Morpheus.js'
  },
  {
    header: 'Options',
    optionList: optionDefinitions
  }
]);
if (commandArgs.help || commandArgs.input == null) {
  console.log(usage);
  process.exit();
}

var endsWith = function (string, suffix) {
  return string.length >= suffix.length
      && string.substr(string.length - suffix.length) === suffix;
};
if (commandArgs.output == null) {
  commandArgs.output = path.basename(commandArgs.input);
  var ext = path.extname(commandArgs.output);
  commandArgs.output = commandArgs.output.substring(0, commandArgs.output.length - ext.length);
}
if (commandArgs.format == null) {
  // infer format from file extension
  var formats = ['pdf', 'png', 'svg'];
  for (var i = 0; i < formats.length; i++) {
    if (endsWith(commandArgs.output.toLowerCase(), '.' + formats[i])) {
      commandArgs.format = formats[i];
      break;
    }
  }
  if (commandArgs.format == null) {
    commandArgs.format = 'png';
  }
}
if (!endsWith(commandArgs.output.toLowerCase(), '.' + commandArgs.format)) {
  commandArgs.output += '.' + commandArgs.format;
}

function convertFilePathToUrl(pathName) {
  if (pathName != null) {
    pathName = path.resolve(pathName);
    if (fs.existsSync(pathName)) {
      pathName = pathName.replace(/\\/g, '/');
      // Windows drive letter must be prefixed with a slash
      if (pathName[0] !== '/') {
        pathName = '/' + pathName;
      }

      // Escape required characters for path components
      // See: https://tools.ietf.org/html/rfc3986#section-3.3
      return encodeURI('file://' + pathName).replace(/[?#]/g, encodeURIComponent);
    }
  }
  return pathName;
};

// var options;
// if (fs.existsSync(path.normalize(commandArgs.input))) {
//   var content = fs.readFileSync(commandArgs.input, {encoding: 'UTF-8'}).trim();
//   options = JSON.parse(content);
// } else {
//   options = JSON.parse(commandArgs.input.trim());
// }
// options.dataset = convertFilePathToUrl(options.dataset);
// options.rowDendrogram = convertFilePathToUrl(options.rowDendrogram);
// options.columnDendrogram = convertFilePathToUrl(options.columnDendrogram);
// if (options.columnAnnotations) {
//   for (var i = 0; i < options.columnAnnotations.length; i++) {
//     options.columnAnnotations[i].file = convertFilePathToUrl(options.columnAnnotations[i].file);
//   }
// }
// if (options.rowAnnotations) {
//   for (var i = 0; i < options.rowAnnotations.length; i++) {
//     options.rowAnnotations[i].file = convertFilePathToUrl(options.rowAnnotations[i].file);
//   }
// }
// var morpheusNode = require('./morpheus-node.js');
// morpheusNode.saveImage(options, commandArgs.output, commandArgs.format);

var program = phantomjs.exec('--web-security=no', path.join(__dirname + path.sep + 'morpheus-phantom.js'), path.normalize(__dirname + path.sep + '..'), commandArgs.input,
    commandArgs.output,
    commandArgs.format,
    commandArgs.port);
program.stdout.pipe(process.stdout);
program.stderr.pipe(process.stderr);







