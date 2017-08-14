exports.saveImage = function (options, outputFile, outputFormat) {
  const path = require('path');
  const fs = require('fs');
  const jsdom = require('jsdom');
  const dom = new jsdom.JSDOM('<div></div>');
  const Canvas = require('canvas-prebuilt');
  // globals
  // XMLSerializer = require('xmlserializer')
  $ = require('../node_modules/morpheus-app/js/jquery-2.2.4.min.js')(dom.window);
  _ = require('../node_modules/morpheus-app/js/underscore-min.js');
  d3 = require('../node_modules/morpheus-app/js/d3.min.js');
  colorbrewer = require('../node_modules/morpheus-app/js/colorbrewer.js').colorbrewer;
  const morpheus = require('../node_modules/morpheus-app/js/morpheus.js');
  const nodeFetch = require('node-fetch');
  Response = nodeFetch.Response;
  Headers = nodeFetch.Headers;
  Request = nodeFetch.Request;

  fetch = function (url, options) {
    const request = new Request(url, options);
    if (request.url.substring(0, 5) === 'file:') {
      return new Promise((resolve, reject) => {
        const filePath = path.resolve(url.substring('file://'.length));
        if (!fs.existsSync(filePath)) {
          reject(`File not found: ${filePath}`);
        }

        const readStream = fs.createReadStream(filePath);
        readStream.on('open', function () {
          resolve(new Response(readStream, {
            url: request.url,
            status: 200,
            statusText: 'OK',
            size: fs.statSync(filePath).size,
            timeout: request.timeout
          }));
        });
      });
    } else {
      return nodeFetch(url, options);
    }
  };

  options.interactive = false;
  options.error = function (err) {
    console.log('Error creating heat map', err);
    process.exit();
  };
  options.loadedCallback = function (heatMap) {
    const bounds = heatMap.getTotalSize();
    const height = bounds.height;
    const width = bounds.width;
    var canvas;
    if (outputFormat === 'png') {
      canvas = new Canvas(width, height);
    } else {
      canvas = new Canvas(width, height, outputFormat);
    }
    heatMap.snapshot(canvas.getContext('2d'));
    fs.writeFile(outputFile, canvas.toBuffer(), function (err) {
      if (err) {
        console.log('error saving ' + outputFile, err);
        process.exit(1);
      }
      process.exit();
    });

  };
  new morpheus.HeatMap(options);
};






