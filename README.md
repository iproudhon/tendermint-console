# Tendermint Console

Tendermint console, a wrapper over 'tendermint' node.js package (https://github.com/nomic-io/js-tendermint).

### How to Use

* Have `node` installed, preferably &gt; v10 (to use await in `repl`).
* Install `tendermint` package: `npm install tendermint` or `npm install -g tendermint`.

Then, run the following

    $ ./tendermint-console.js ws://localhost:26657

If a url, e.g. `ws://localhost:26657` is given as a command line option, it'll connect to the given server and return the connection as `link` global variable. Otherwise, one can make a connection as follows.

    > var link = connect('ws://localhost:26657')

For the list of commands that are available, refer to the source and the above tendermint node.js package repository.

### Select Commands

#### Get Peers

    > link.netInfo().then(log)
    or
    > var peers = await link.peers(); peers

#### Get Block

A block by height

    > var b = await link.block({ height: 10000 }); b.block.header.height

The latest block

    > link.block().then(log)

#### Get Transaction

By hex or base64 transaction hash

    > await link.getTx(hash)

By base64 transaction hash

    > await link.tx({hash: hash, prove: true})
    
#### Get TPS

To get transactions per seconds.

    # args
    #   ix:         starting block if > 0, or number of blocks to go back if < 0
    #   count:      number of blocks to aggregate
    #   skip_zeros: do not print if an aggregate doesn't have any transactions
    > link.viewTps(-1000000, 100, true).then(log)

Import this into spreadsheets to get a nice looking graph.

#### More To Be Added
