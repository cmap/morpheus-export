var fs = require('fs');
var system = require('system');
var webPage = require('webpage');
var server = require('webserver').create();
var args = system.args;
var path = args[1];
var options = args[2];
var outputFile = args[3];
var outputFormat = args[4];
var port = parseInt(args[5]);
var page = webPage.create();
page.settings.localToRemoteUrlAccessEnabled = true;

if (port > 0) {
  var listening = server.listen(port, function (request, response) {
    var index = request.url.indexOf('path=');
    var path = request.url.substring(index + 'path='.length);
    path = path.replace(/[\\\/]/g, fs.separator);
    if (!fs.exists(path) || !fs.isFile(path)) {
      console.log(path + ' not found');
      phantom.exit();
    }

    response.statusCode = 200;
    response.headers = {'Cache': 'no-cache'};
    response.write(fs.read(path));
    response.close();
  });
  if (!listening) {
    console.log('could not create web server on port ' + port);
    phantom.exit();
  }
}
page.onConsoleMessage = function (msg) {
  console.log(msg);
};

page.onCallback = function (binaryStr) {
  // save the image to disk
  var out = fs.open(outputFile, 'wb');
  out.write(binaryStr);
  out.close();
  phantom.exit();
};

function injectJSString(script) {
  page.evaluate(function (js) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = js;
    document.head.appendChild(script);
  }, script);
};
var extJsPath = fs.absolute(path + '/node_modules/morpheus-app/js/morpheus-external-latest.min.js');
if (!fs.exists(extJsPath)) {
  console.log('Unable to find Morpheus JavaScript');
  phantom.exit();
}
injectJSString(fs.read(extJsPath));
injectJSString(fs.read(fs.absolute(path + '/node_modules/morpheus-app/js/morpheus.js')));
injectJSString(fs.read(fs.absolute(path + '/node_modules/whatwg-fetch/fetch.js')));
injectJSString(fs.read(fs.absolute(path + '/node_modules/promise-polyfill/promise.js')));
var createImage = function () {
  page.evaluate(function (data) {
    morpheus.Util.TRACKING_ENABLED = false;
    var options = data.options;
    options.interactive = false;
    options.error = function (err) {
      console.log('Error creating heat map', err);
      phantom.exit();
    };
    options.loadedCallback = function (heatMap) {
      window.saveAs = function (blob) {
        var reader = new FileReader();
        reader.onloadend = function () {
          window.callPhantom(reader.result);
        };
        reader.readAsBinaryString(blob);
      };
      heatMap.saveImage('tmp', data.outputFormat);
    };
    new morpheus.HeatMap(options);
  }, {outputFormat: outputFormat, options: options});
};

if (fs.exists(options)) {
  var content = fs.read(options).trim();
  options = JSON.parse(content);
} else {
  options = JSON.parse(options.trim());
}

// convert file URLS to localhost URLs
function convertFilePathToUrl(value) {
  if (value != null) {
    value = fs.absolute(value);
    if (fs.exists(value) && fs.isFile(value)) {
      return 'http://localhost:' + port + '/?path=' + value;
    }
  }
  return value;
};

if (port > 0) {
  options.dataset = convertFilePathToUrl(options.dataset);
  options.rowDendrogram = convertFilePathToUrl(options.rowDendrogram);
  options.columnDendrogram = convertFilePathToUrl(options.columnDendrogram);
  if (options.columnAnnotations) {
    for (var i = 0; i < options.columnAnnotations.length; i++) {
      options.columnAnnotations[i].file = convertFilePathToUrl(options.columnAnnotations[i].file);
    }
  }
  if (options.rowAnnotations) {
    for (var i = 0; i < options.rowAnnotations.length; i++) {
      options.rowAnnotations[i].file = convertFilePathToUrl(options.rowAnnotations[i].file);
    }
  }
}
createImage();






