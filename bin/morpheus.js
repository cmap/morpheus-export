#!/usr/bin/env node

var commandLineArgs = require('command-line-args');
var getUsage = require('command-line-usage');
var path = require('path');
var phantomjs = require('phantomjs-prebuilt');
var optionDefinitions = [
  {name: 'input', alias: 'i', type: String, description: 'JSON configuration (https://software.broadinstitute.org/morpheus/configuration.html)'},
  {name: 'output', alias: 'o', type: String, description: 'output image file'},
  {name: 'format', alias: 'f', type: String, description: 'output file format (png or svg)'},
  {name: 'help', alias: 'h', type: Boolean, description: 'print this usage guide'},
  {name: 'port', type: Number, description: 'web server port (default is 9222)', defaultValue: 9222}
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
  if (endsWith(commandArgs.output.toLowerCase(), '.png')) {
    commandArgs.format = 'png';
  } else {
    commandArgs.format = 'svg';
  }
}
if (!endsWith(commandArgs.output.toLowerCase(), '.' + commandArgs.format)) {
  commandArgs.output += '.' + commandArgs.format;
}
var program = phantomjs.exec('--web-security=no', path.join(__dirname + path.sep + 'morpheus-phantom.js'), path.normalize(__dirname + path.sep + '..'), commandArgs.input,
    commandArgs.output,
    commandArgs.format,
    commandArgs.port);
program.stdout.pipe(process.stdout);
program.stderr.pipe(process.stderr);







