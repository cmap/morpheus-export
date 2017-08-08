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
page.settings.webSecurityEnabled = false;
var indexPath = fs.absolute(path + '/node_modules/morpheus-app/index.html');
if (!fs.exists(indexPath)) {
  console.log('Unable to load Morpheus: ' + indexPath);
  phantom.exit();
}
if (port > 0) {
  var listening = server.listen(port, function (request, response) {
    var path = request.url.substring(1);
    path = path.replace(/[\\\/]/g, fs.separator);
    if (!fs.exists(path) || !fs.isFile(path)) {
      console.log(path + ' not found');
      phantom.exit();
      // response.statusCode = 404;
      // response.write('<html><head></head><body><h1>File Not Found</h1><h2>File:' + path + '</h2></body></html>');
      // response.close();
      // return;
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

var ignoreUrls = [
  'https://www.dropbox.com/static/api/2/dropins.js', 'https://apis.google.com/js/api.js', 'https://www.google-analytics.com/analytics.js',
  'https://s3.amazonaws.com/data.clue.io/morpheus/tcga/tcga_index.txt'];
page.onResourceRequested = function (requestData, networkRequest) {
  // redirect file system requests
  if (requestData.url.substring(0, 8) !== 'https://' && requestData.url.substring(0, 7) !== 'http://' && requestData.url.substring(0, 7) !== 'file://') {
    var newUrl = 'http://localhost:' + port + '/' + requestData.url;
    networkRequest.changeUrl(newUrl);
  } else {
    for (var i = 0; i < ignoreUrls.length; i++) {
      if (requestData.url === ignoreUrls[i]) {
        networkRequest.abort();
        break;
      }
    }
  }
};

var createImage = function () {
  page.open(indexPath, function (status) {
    if (status !== 'success') {
      console.log('Unable to load Morpheus.');
      phantom.exit();
    }
    page.evaluate(function (data) {
      var options = data.options;
      options.interactive = false;
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
    page.onCallback = function (binaryStr) {
      // save the image to disk
      var out = fs.open(outputFile, 'wb');
      out.write(binaryStr);
      out.close();
      phantom.exit();
    };
  });
};

if (fs.exists(options)) {
  var content = fs.read(options).trim();
  options = JSON.parse(content);
} else {
  options = JSON.parse(options.trim());
}

createImage();






