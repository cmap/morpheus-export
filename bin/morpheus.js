#!/usr/bin/env node

var commandLineArgs = require('command-line-args');
var getUsage = require('command-line-usage');
var path = require('path');
var phantomjs = require('phantomjs-prebuilt');
var optionDefinitions = [
  {name: 'input', alias: 'i', type: String, description: 'JSON configuration (https://software.broadinstitute.org/morpheus/configuration.html)'},
  {name: 'output', alias: 'o', type: String, description: 'output file'},
  {name: 'format', alias: 'f', type: String, defaultValue: 'png', description: 'output file format (png or svg)'},
  {name: 'port', type: Number, description: 'web server port', defaultValue: 9222},
  {name: 'help', alias: 'f', type: Boolean, description: 'print this usage guide'}
];

var commandArgs = commandLineArgs(optionDefinitions);

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
if (commandArgs.help || commandArgs.input == null || commandArgs.output == null) {
  console.log(usage);
  process.exit();
}

var program = phantomjs.exec(path.join(__dirname + path.sep + 'morpheus-phantom.js'), path.normalize(__dirname + path.sep + '..'), commandArgs.input, commandArgs.output,
    commandArgs.format,
    commandArgs.port);
program.stdout.pipe(process.stdout);
program.stderr.pipe(process.stderr);
// program.on('exit', code = > {
//   process.exit();
// })







