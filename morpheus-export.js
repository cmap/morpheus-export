#!/usr/bin/env node

var commandLineArgs = require('command-line-args')
var getUsage = require('command-line-usage')
var path = require('path')
var http = require('http')
var fs = require('fs')
const Nightmare = require('nightmare')
const nightmare = Nightmare({
  show: false,
  webPreferences: {
    nodeIntegration: true,
  },
})
var optionDefinitions = [
  {
    name: 'input',
    alias: 'i',
    type: String,
    description: 'JSON configuration (https://software.broadinstitute.org/morpheus/configuration.html)',
  },
  {
    name: 'output',
    alias: 'o',
    type: String,
    description: 'output image file',
  },
  {
    name: 'format',
    alias: 'f',
    type: String,
    description: 'output file format (pdf, png, svg)',
  },
  {
    name: 'port',
    type: Number,
    description: 'port for temporary web server for reading local files',
    defaultValue: 9432,
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'print this usage guide',
  },
]

var commandArgs
try {
  commandArgs = commandLineArgs(optionDefinitions)
} catch (x) {
  console.log('' + x)
  console.log(usage)
  process.exit()
}

var usage = getUsage([
  {
    header: 'morpheus',
    content: 'Generate static heat maps using Morpheus.js',
  },
  {
    header: 'Options',
    optionList: optionDefinitions,
  },
])
if (commandArgs.help || commandArgs.input == null) {
  console.log(usage)
  process.exit()
}

var endsWith = function (string, suffix) {
  return string.length >= suffix.length
    && string.substr(string.length - suffix.length) === suffix
}
if (commandArgs.output == null) {
  commandArgs.output = path.basename(commandArgs.input)
  var ext = path.extname(commandArgs.output)
  commandArgs.output = commandArgs.output.substring(0, commandArgs.output.length - ext.length)
}
if (commandArgs.format == null) {
  // infer format from file extension
  var formats = ['pdf', 'png', 'svg']
  for (var i = 0; i < formats.length; i++) {
    if (endsWith(commandArgs.output.toLowerCase(), '.' + formats[i])) {
      commandArgs.format = formats[i]
      break
    }
  }
  if (commandArgs.format == null) {
    commandArgs.format = 'png'
  }
}
if (!endsWith(commandArgs.output.toLowerCase(), '.' + commandArgs.format)) {
  commandArgs.output += '.' + commandArgs.format
}

function convertFilePathToUrl (pathName) {
  if (pathName != null) {
    pathName = path.resolve(pathName)
    if (fs.existsSync(pathName)) {
      pathName = pathName.replace(/\\/g, '/')
      // Windows drive letter must be prefixed with a slash
      if (pathName[0] !== '/') {
        pathName = '/' + pathName
      }

      // Escape required characters for path components
      // See: https://tools.ietf.org/html/rfc3986#section-3.3
      return encodeURI('file://' + pathName).replace(/[?#]/g, encodeURIComponent)
    }
  }
  return pathName
}

var options = commandArgs.input
var outputFile = commandArgs.output
var outputFormat = commandArgs.format
var port = commandArgs.port

if (port > 0) {
  var server = http.createServer(function (request, response) {
    // /?path=/Users/jgould/git/wot/foo.gct
    var pathIndex = request.url.indexOf('path=')
    var path = request.url.substring(pathIndex + 'path='.length)
    // path = path.replace(/[\\\/]/g, fs.separator)
    if (!fs.existsSync(path)) {
      console.log(path + ' not found')
      process.exit()
    }
    // response.statusCode = 200;
    // response.headers = {'Cache': 'no-cache'};
    fs.readFile(path, function (error, content) {
      if (error) {
        response.writeHead(500)
        response.end('Error: ' + error.code + ' ..\n')
        response.end()
      }
      else {
        response.end(content)
      }
    })

  })
  server.listen(port)

}
//
// protocol.registerFileProtocol('atom', (request, callback) => {
//   const url = request.url.substr(7)
//   callback({path: path.normalize(`${__dirname}/${url}`)})
// }, (error) => {
//   if (error) {
//     console.error('Failed to register protocol')
//   }
// })
var createImage = function () {
  nightmare.goto('file://' + __dirname + path.normalize('/node_modules/morpheus-app/index.html')).
    evaluate(function (options, outputFile, outputFormat) {
      var promise = new Promise(function (resolve, reject) {
        morpheus.Util.TRACKING_ENABLED = false
        options.interactive = false
        options.error = function (err) {
          reject('is node ' + morpheus.Util.isNode())
        }
        options.loadedCallback = function (heatMap) {
          window.saveAs = function (blob) {
            var reader = new FileReader()
            reader.onloadend = function () {
              resolve(reader.result)
            }
            reader.readAsBinaryString(blob)
          }
          if (outputFormat === 'png') {
            var bounds = heatMap.getTotalSize()
            var canvas = $('<canvas></canvas>')[0]
            var height = bounds.height
            var width = bounds.width
            var backingScale = morpheus.CanvasUtil.BACKING_SCALE
            canvas.height = backingScale * height
            canvas.style.height = height + 'px'
            canvas.width = backingScale * width
            canvas.style.width = width + 'px'
            var context = canvas.getContext('2d')
            morpheus.CanvasUtil.resetTransform(context)
            heatMap.snapshot(context)
            var base64 = canvas.toDataURL('image/png', 0)
            base64 = atob(base64.substring('data:image/png;base64,'.length))
            resolve(base64)
          } else {
            heatMap.saveImage('tmp', outputFormat)
          }

        }
        new morpheus.HeatMap(options)
      })
      return promise
    }, options, outputFile, outputFormat).
    then(function (value) {
      fs.writeFileSync(outputFile, value, 'binary')
      process.exit(0)
    }).catch(function (err) {
    console.log('Error saving heat map.')
    console.log(err)
    process.exit(1)
  })
}

if (fs.existsSync(options)) {
  var content = fs.readFileSync(options, 'utf8').trim()
  options = JSON.parse(content)
} else {
  options = JSON.parse(options.trim())
}

// convert file URLS to localhost URLs
function convertFilePathToUrl (value) {
  if (value != null) {
    value = path.normalize(value)
    if (fs.existsSync(value)) {
      return 'http://localhost:' + port + '/?path=' + value
      //return 'file://' + value
    }
    return value
  }

  return value
}

if (port > 0) {
  options.dataset = convertFilePathToUrl(options.dataset)
  options.rowDendrogram = convertFilePathToUrl(options.rowDendrogram)
  options.columnDendrogram = convertFilePathToUrl(options.columnDendrogram)
  if (options.columnAnnotations) {
    for (var i = 0; i < options.columnAnnotations.length; i++) {
      options.columnAnnotations[i].file = convertFilePathToUrl(options.columnAnnotations[i].file)
    }
  }
  if (options.rowAnnotations) {
    for (var i = 0; i < options.rowAnnotations.length; i++) {
      options.rowAnnotations[i].file = convertFilePathToUrl(options.rowAnnotations[i].file)
    }
  }
}
createImage()







