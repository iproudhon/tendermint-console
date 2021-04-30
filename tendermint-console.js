#!/bin/bash

':' //; export NODE_OPTIONS=--experimental-repl-await;
':' //; export NODE_PATH=$(npm root -gq):$(npm root -q):.
':' //; LINK_URL=$1 exec "$(which node)" -r $0

// console.js
//
// npm install tendermint
//   => https://github.com/nomic-io/js-tendermint
//
// https://docs.tendermint.com/master/rpc/

// utility functions
function loadFile(fn) {
    return require('fs').readFileSync(fn).toString()
}

function loadScript(fn) {
    // eval in global scope
    eval.apply(this, [ loadFile(fn) ])
//    eval.apply(global, [ loadFile(fn) ])
}

delay = function(ms) {
    return new Promise(resolve = setTimeout(resolve, ms))
}

// start connection
// e.g. ws://localhost:26657

function connect(url) {
    if (typeof global.log === typeof undefined) {
        try { global.log = console.log } catch {}
    }

    var cli = require('tendermint').RpcClient(url)

    // HACK: removing 'uncaughtException' handler,
    //   set during require('Tendermint')
    process.removeAllListeners('uncaughtException')

    cli.hex_b64 = function(data) {
        return Buffer.from(data, 'hex').toString('base64')
    }

    cli.b64_hex = function(data) {
        return Buffer.from(data, 'base64').toString('hex')
    }

    // set up methods

    // cli.health() => /health
    // cli.status() => /status
    // cli.netInfo() => /net_info => peers
    // cli.blockchain({ minHeight: 1, maxHeight: 100 }) => /blockchain
    // cli.block({ height: 100 }) => /block
    // => /block_by_hash : TODO: missing
    // cli.blockResults({ height: 100 }) => /block_results
    // cli.commit({ height: 100 }) => /commit
    // cli.validators({ height: 100, page: 1, per_page: 100 }) => /validators
    // cli.genesis() => /genesis
    // cli.dumpConsensusState() => /dump_consensus_state
    // cli.consensusState() => /consensus_state
    // cli.consensus_params({height: 100}) => /consensus_params
    // cli.unconfirmedTxs({limit: 100}) => /unconfirmed_txs
    // cli.numUnconfirmedTxs() => /numUnconfirmed_txs
    // cli.txSearch({query: "tx.height=100"}, prove: true, page: 1,
    //               per_page: 100, order_by: asc|desc}) => /tx_search
    // cli.blockSearch({query: "block.height > 1000 AND valset.changed > 0"},
    //   page: 1, per_page: 100, order_by: asc|desc) => /block_sesrch
    //   : TODO: missing
    // cli.tx({hash: 'hash', prove: true|false}) => /tx

    // lastest block number
    cli.blockNumber = async function() {
        return parseInt((await this.status()).sync_info.latest_block_height)
    }

    cli.peers = cli.netInfo

    // same as .tx(), but with hex hash converted to base64
    cli.getTx = function(txh) {
        if (txh.length == 66 && txh.substring(0, 2).toLowerCase() == "0x")
            txh = txh.substring(2)
        if (txh.length == 64)
            txh = this.hex_b64(txh)
        return cli.tx({ hash: txh, prove: true })
    }

    // need to add account access

    //
    cli.viewTxs = async function(ix, skip_zeros) {
        var lix = await this.blockNumber()
        if (ix < 0) {
            ix = lix + ix
        }
        if (ix < 0) {
            ix = 0
        }
        for (var i = ix; i <= lix; i++) {
            var b = await this.block({height: i})
            var txslen = b.block.data.txs == null ? 0 : b.block.data.txs.length
            if (txslen == 0 && skip_zeros)
                continue
            var d = (new Date(b.block.header.time))
            console.log(i + ": " + txslen + ", " + d.getTime() + ", " +
                        b.block.header.time)
        }
    }

    // e.g
    // echo "link.viewTps(-10000, 100, true).then(process.exit)" | tendermint-console.js ws://localhost:26657
    cli.viewTps = async function(ix, per, skip_zeros) {
        var lix = await this.blockNumber()
        if (ix < 0) {
            ix = lix + ix
        }
        if (ix < 0) {
            ix = 0
        }
        var ttxs = 0

        console.log("block,total-txs,txs,tps,timestamp,date")

        til = (Math.floor(lix / 100) + 1) * 100
        for (var ix = Math.floor(ix / per) * per; ix <= til; ix += per) {
            if (ix <= 0)
                continue
            var six = ix - per + 1
            var eix = ix;
            if (eix > lix)
                eix = lix;
            if (six >= eix)
                continue
            var txs = 0, pb = null, lb = null
            var pb = await this.block({height: six-1})
            var pbt = (new Date(pb.block.header.time)).getTime()
            var lb = await this.block({height: eix})
            var lbt = (new Date(lb.block.header.time)).getTime()
            for (j = six; j <= eix; j++) {
                var b = (await this.block({height: j}))
                txs += b.block.data.txs == null ? 0 : b.block.data.txs.length
            }
            if (txs == 0 && skip_zeros)
                continue
            var dt = lbt - pbt
            if (dt <= 0)
                continue
            var tps = Math.floor(txs * 1000 / dt * 1000) / 1000
            ttxs += txs
            console.log(lb.block.header.height + "," + ttxs + "," + txs + "," +
                        tps + "," + lbt + "," + lb.block.header.time)
        }
    }

    // debugging
    cli.o_o = function(args, listener) {
	return cli.call("o_o", args, listener).then((res) => { return res })
    }

    cli.o_d = function() { return cli.o_o({ do: 0 }) }
    cli.o_e = function() { return cli.o_o({ do: 1 }) }
    cli.o_r = function() { return cli.o_o({ do: 2 }) }
    cli.o_s = function() { return cli.o_o({ do: 3 }) }

    return cli
}

global.connect = connect
global.loadFile = loadFile
global.loadScript = loadScript

// if $1 (=> LINK_URL) is given, it's a url to a link node
if (process.env['LINK_URL'] && process.env['LINK_URL'] != "") {
    var link_url = process.env['LINK_URL']
    console.log("connecting to " + link_url + "...")
    global.link = connect(link_url)
}

// EOF
