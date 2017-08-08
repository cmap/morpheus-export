# morpheus-export
Export static heat maps images using [Morpheus.js](https://software.broadinstitute.org/morpheus/)
 
Morpheus-export can be used where headless export of heat maps are required (e.g. automatic report generation).

## Install

First, make sure you have node.js installed. Go to [nodejs.org](https://nodejs.org/en/download/) and download/install node for your platform. 

After node.js is installed, open a terminal and type:
    
    npm install morpheus-export -g

OR:
    
    git clone https://github.com/cmap/morpheus-export.git
    npm install
    npm link


Note: depending on how you installed Node, you may have to create a symlink from `nodejs` to `node`. Example on Linux:

```
ln -s `which nodejs` /usr/bin/node
```

## Running
    
    morpheus-export --help
to see a list of options


## License

BSD license.
