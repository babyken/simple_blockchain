require('dotenv').config()
const crypto = require('crypto')
const SHA256 = message => crypto.createHash("sha256").update(message).digest('hex')
const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const WS = require('ws')
const express = require('express')
const cors = require('cors')

const { Blockchain } = require('./blockchain/Blockchain')
const {Transaction, InputRecord, OutputRecord }= require('./blockchain/Transaction')
const UTXO = require('./blockchain/UTXO')
const Block = require('./blockchain/Block')
const {opened, connect, wsPort, sendMessage, produceMessage, MY_ADDRESS} = require('./Connection')
const MsgType = require('./MessageType')

// ============ Node Keys ============ //
// Public key == wallet
const keyPair = process.env.PRIVATE_KEY ? ec.keyFromPrivate(process.env.PRIVATE_KEY, 'hex') : ec.genKeyPair()
// sign transaction only need keyPair, seems private key use in no where
// const privateKey = keyPair.getPrivate('hex')
const publicKey = keyPair.getPublic('hex')

// ============ Enable Debug =============== //
if (process.env.DEBUG) {
    require('./helpers/utils')
}

process.argv.forEach(function (val, index, array) {
    if(index > 1) {
        if(val === 'debug') {            
            require('./helpers/utils')
        }
    }
})

process.on('uncaughtException', err=>console.log(err))

// =========== Setup Node web socket ============== /
const PEERS = ['ws://localhost:3000']
const server = new WS.Server({ port: wsPort })
const myMainChain = new Blockchain()
console.log('WebSocket is listening to port:', wsPort)

// =========== Setup Express ================ //
const app = express()
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true }))
app.use(cors())
const expressPort = +wsPort + 1000

// TODO, remove these global variables
// let check = []
// let checked = []
// let checking = false
// For newly added node
let tempChain = {}
let isSyncChain = false

server.on("connection", async (socket, req) => {
    socket.on('message', message => {
        
        const _message = JSON.parse(message)

        switch(_message.type) {
            case MsgType.handshake:
                const node = _message.data                
                connect(node)
                break
            case MsgType.createTransaction:
                const [transaction, creatorAddress] = _message.data
                const tx =  Transaction.transactionFromJson(transaction)                               

                myMainChain.addTransaction(tx)
                
                // update UTXO by transaction info
                myMainChain.utxo = myMainChain.utxo.filter(xo => xo.wallet !== creatorAddress )                                
                myMainChain.utxo.push(...tx.generateUTXOList())

                break
            // should call add block or update chain?
            case MsgType.updateChain:
                const [ _newBlock, newDiff,  _newUtxo] = _message.data
                const newBlock =  Block.blockFromJson(_newBlock)
                let newUtxoList = []
                for(const xoJson of _newUtxo) {
                    const newUtxo = UTXO.utxoFromJson(xoJson) 
                    newUtxoList.push(newUtxo)               
                }
                

                const ourTx = myMainChain.pendingTransactions.map(tx =>JSON.stringify(tx))
                const theirTx = newBlock.transactions.filter(tx=>tx.inputRec.length!=0).map(tx => JSON.stringify(tx))
                const n = theirTx.length

                // Use 2 since it doesn't add a new block yet
                let myNewDiff = myMainChain.getDifficulty(newBlock)
                // if((myMainChain.chain.length + 1)%3==0) {
                //     myNewDiff = myMainChain.difficulty +  1//Math.floor((myMainChain.chain.length + 1) /3)
                // }
                

                const latestBlock = myMainChain.getLatestBlock()

                // newBlock != latestBlock
                // if not equal, then maybe lag behind. and unsync
                if (newBlock.previousHash !== latestBlock.previousHash) {
                    // Check is our pending transaction equal to income pendTransaction
                    for( let i=0; i<n; i++) {
                        // compare index
                        const index = ourTx.indexOf(theirTx[i])

                        // can't find the index
                        if(index === -1) break

                        // ??? if it's match, then remove it from theirTx
                        ourTx.splice(index, 1)
                        theirTx.splice(i, 1)
                    }
                    console.log('Update_CHAIN: Check conditions...')                    

                    console.log('==============================')
                    // if theirTx is not zero length, it means our pending Transaction is not sync
                    console.log('Pending Tx sync:', theirTx.length === 0)
                    console.log('New Blk hash check:',SHA256(newBlock.index + latestBlock.hash + newBlock.timestamp + JSON.stringify(newBlock.transactions) + newBlock.nonce) === newBlock.hash)                    
                    console.log('New Blk hash meet diff(%d):', myMainChain.difficulty,newBlock.hash.startsWith(Array(myMainChain.difficulty+1).join('0')))
                    console.log('New Block has valid Tx:',Block.hasValidTransactions(newBlock, myMainChain))
                    console.log('NewBlock timestamp > my latestBlock timestamp:',(parseInt(newBlock.timestamp) > parseInt(latestBlock.timestamp) || latestBlock.timestamp === ''))
                    console.log('New Block timestamp < currecnt time:',parseInt(newBlock.timestamp) < Date.now())
                    console.log('My latest block is parent block of new block:',latestBlock.hash === newBlock.previousHash)
                    console.log('Diff match:', myNewDiff === newDiff)
                    console.log('==============================')

                    // if not true, should sync with others
                    if (
                        theirTx.length === 0 &&
                        SHA256(newBlock.index + latestBlock.hash + newBlock.timestamp + JSON.stringify(newBlock.transactions) + newBlock.nonce) === newBlock.hash &&
                        newBlock.hash.startsWith(Array(myMainChain.difficulty+1).join('0')) &&
                        Block.hasValidTransactions(newBlock, myMainChain) &&
                        (parseInt(newBlock.timestamp) > parseInt(latestBlock.timestamp) || latestBlock.timestamp === '') &&
                        parseInt(newBlock.timestamp) < Date.now() &&
                        latestBlock.hash === newBlock.previousHash &&
                        (myNewDiff === newDiff)
                    ) {
                        console.log('Update_CHAIN: Add new block, update chainstate(difficulty, pending tx and utxo)')
                        myMainChain.chain.push(newBlock)
                        myMainChain.difficulty = newDiff                        
                        myMainChain.syncUTXO(newUtxoList)
                        myMainChain.pendingTransactions = ourTx.map(tx => transactionFromJson(JSON.parse(tx)))
                    }

                } 
                // majority support
                // need to set checking for each block. wait for few seconds to check which is the currecnt latest block
                
                // else if (!checked.includes(JSON.stringify([latestBlock.previousHash, myMainChain.chain[myMainChain.chain.length-2].timestamp]))) {
                //     const latestBlock = myMainChain.getLatestBlock()
                //     // hash and timestamp of previous block
                //     // double check both
                //     checked.push(JSON.stringify([latestBlock.previousHash, myMainChain.chain[myMainChain.chain.length-2].timestamp]))

                //     const position = myMainChain.chain.length -1
                //     checking = true;
                //     sendMessage(MsgType.requestCheck, MY_ADDRESS)

                //     setTimeout(() => {
                //         checking = false
                //         let mostAppeared = check[0]


                //         // what's exactly group here?
                //         check.forEach(group => {
                //             if(check.filter(_group =>_group === group).length > check.filter(_group => _group === mostAppeared).length) {
                //                 mostAppeared = group
                //             }
                //         })

                //         const group = JSON.parse(mostAppeared)
                //         myMainChain.chain[position] = group[0]
                //         myMainChain.pendingTransactions = [...group[1]]
                //         myMainChain.difficulty = group[2]

                //         check.splice(0, check.length)

                //     }, 5000)
                // }
                break
            // case MsgType.requestCheck:
            //     opened.filter(node => node.address === _message.data).socket.send(
            //         produceMessage(
            //             MsgType.sendCheck,
            //             JSON.stringify([myMainChain.getLatestBlock(), myMainChain.pendingTransactions, myMainChain.difficulty])
            //         )
            //     )                
            //     break
            // case MsgType.sendCheck:
            //     if(checking) check.push(_message.data)
            //     break                
            case MsgType.requestChain:
                const socket = opened.filter(node => node.address === _message.data)[0].socket

                for(let i=0; i<myMainChain.chain.length; i++){
                    socket.send(produceMessage(
                        MsgType.sendChain,
                        {
                            block: myMainChain.chain[i],
                            finished: i === myMainChain.chain.length - 1,
                            socketAddress: MY_ADDRESS
                        }
                    ))
                }
                break
                // Receive Blockchain from others
            case MsgType.sendChain:
                // Consensus here
                if(isSyncChain) {                    
                    const {block, finished, socketAddress} = _message.data
                    

                    // Create a new index by socket address
                    if (!tempChain[socketAddress]) {
                        tempChain[socketAddress] = {}
                        tempChain[socketAddress].bc = new Blockchain()
                    }                    
                    
                    // Check if block already exist in chain (very low probability happen since they are all from same peer)
                    if(tempChain[socketAddress].bc.chain.filter(blk => JSON.stringify(blk) === JSON.stringify(block)).length === 0) {
                        const newBlock = Block.blockFromJson(block)    
                        tempChain[socketAddress].bc.chain.push(newBlock)
                    }

                    
                    

                    if (finished) {                                                             
                        
                        if(Blockchain.isChainValid(tempChain[socketAddress].bc, myMainChain)) {
                        
                            // Check all finished
                            tempChain[socketAddress].isFinished = finished
                            
                            let isAllFinished = true
                            for (const peerAddress in tempChain) {                                
                                isAllFinished &= tempChain[peerAddress].isFinished
                            }                            
                            
                            const askedPeerCount = Math.ceil(myMainChain.syncThreshold * opened.length)
                            // Folowing logic sems always trust the first one to connect ?!~
                            // Let's assume more than 1 peer
                            if(isAllFinished && Object.keys(tempChain).length==askedPeerCount) {
                                // Pattern is the hash of blockchain object
                                let matchPatternCount = 0
                                let matchPattern = ''
                                let pattern = []
                                let address = []
                                let index = 0
                                for (const peerAddress in tempChain) {
                                    const bc = tempChain[peerAddress].bc



                                    const bcHash = SHA256(JSON.stringify(bc))

                                    if(pattern.length == 0 ) {
                                        // for first item, nth to compare
                                        
                                        matchPatternCount++
                                        pattern.push(bcHash)
                                        address.push(peerAddress)
                                    } else {
                                        // compare current to previous item
                                        const prevIndex = index-1
                                        if(pattern[prevIndex] == bcHash) {
                                            matchPatternCount++
                                            matchPattern = bcHash
                                            pattern.push(bcHash)
                                            address.push(peerAddress)
                                            matchPattern = bcHash
                                        }
                                    }
                                    index++
                                }


                                // Enough peer have the same hash

                  


                                if(matchPatternCount >= Math.ceil(askedPeerCount*myMainChain.syncThreshold)) {
                                    // send to trusted peer ask for info
                                    for(const add of address){
                                        opened.filter(node => node.address === add)[0].socket.send(
                                            produceMessage(
                                                MsgType.requestInfo,
                                                MY_ADDRESS
                                            )
                                        )
                                    }

                                    const newBlockChain = tempChain[address[0]].bc
                                    myMainChain.chain = Array.from(newBlockChain.chain)

                                } else {
                                    console.log('Not enough trusted peer to sync chain and request info')
                                }

                                tempChain = {}
                                isSyncChain = false
                                
                            }


                        }

                    
                    }
                }
                break
            // Receive info request from other
            case MsgType.requestInfo:
                // request difficulty and pending transaciton pool
                opened.filter(node => node.address ===_message.data)[0].socket.send(
                    produceMessage(
                        MsgType.sendInfo,
                        [myMainChain.difficulty, myMainChain.pendingTransactions, myMainChain.utxo]
                    )
                )

                
                break
            // Receive requested info from others
            case MsgType.sendInfo:

                // TODO: Now trust everyone
                // propose set a % in send message
                // then send number of peer randomly in the network (avalanche approache)
                
                myMainChain.difficulty = _message.data[0]
                myMainChain.pendingTransactions = _message.data[1]
                let _newUtxoList = []
                for(const xoJson of _message.data[2]) {
                    const newUtxo = UTXO.utxoFromJson(xoJson) 
                    _newUtxoList.push(newUtxo)               
                }
                // Overwrite the UTXO
                // myMainChain.syncUTXO(_newUtxoList)
                myMainChain.utxo = _newUtxoList
                break

            
        }
    })

    socket.on('error', (err) => {
        console.log(err.stack)
    })
})


// ==============================================
// ============= Main program ================ //
// ==============================================

// Cold start and connect to bootstrap node
PEERS.forEach(peer => connect(peer))



function mine() {
    if (myMainChain.pendingTransactions.length !== 0) {
        myMainChain.minePendingTransactions(publicKey)

    } else {
        // mine empty block
        myMainChain.mineEmptyBlock(publicKey)
    }

    const latestBlock = myMainChain.getLatestBlock()
        
    // send latest block and chainstate
    sendMessage(MsgType.updateChain, [
        latestBlock,
        myMainChain.difficulty,
        myMainChain.utxo
    ])
    
    return latestBlock.hash
    
}

function mineGhost() {
    myMainChain.mineEmptyBlock(publicKey)
    const latestBlock = myMainChain.getLatestBlock()
    return latestBlock.hash
}

function mineLoop() {
    setInterval(()=> {
        mine()
    }, 3000)
}



// Testing between 3000 node and other nodes
// only 3000 nodes will mine
// if (wsPort == 3000) {
//     mineLoop()
// }


// ==============================================
// ================ Express =====================
// ==============================================

// Get Public address / wallet
app.get('/address', (req, res) => {
    res.send({success: true, wallet: publicKey})
})

app.get('/peer', (req, res) => {
    let peerAddressList = opened.map(peer => peer.address)
    peerAddressList.push(MY_ADDRESS)
    res.send({success: true, address: peerAddressList})
})



app.get('/balance', (req, res) => {
    res.send({success: true, balance: myMainChain.getBalanceOfAddress(publicKey)})
})

// Create transaction and boardcast to other node
// input: destination public address, amount
app.post('/transaction', (req, res) => {      
    
    const {destination, amount} = req.body            
    const myBalance = myMainChain.getBalanceOfAddress(publicKey)
    

    if (myBalance > amount) {
        // Create new input records from utxo
        const myUtxo = myMainChain.utxo.filter(xo => xo.wallet === publicKey )

        let inputRecList = []
        // Create input records
        for(const xo of myUtxo) {            
            const newInRec = new InputRecord(xo.txId, xo.index, xo.amount) 
            newInRec.signRecord(keyPair)              
            inputRecList.push(newInRec)
        }

        // create output records
        const newOutRec = new OutputRecord(destination, amount)

        // create new output record for the amount I left
        const leftOutRec = new OutputRecord(publicKey, myBalance-amount)        
        
        const transaction = new Transaction(inputRecList, [newOutRec, leftOutRec])
        transaction.signTransaction(keyPair)
        try {
            myMainChain.addTransaction(transaction)

            // Remove all of my UTXO records
            myMainChain.utxo = myMainChain.utxo.filter(xo => xo.wallet !== publicKey )
            myMainChain.utxo.push(...transaction.generateUTXOList())        
        
            sendMessage(MsgType.createTransaction, [transaction, publicKey])

            res.send({success: true, txId: transaction.calculateHash()})

        } catch(err) {
            console.log(err)
            if ( myMainChain.pendingTransactions.length > 0) {
                res.send({success: false, msg: 'Money is holded, plaese mine block to confirm pending transactions.'})
            } else {
                res.send({success: false, msg: 'Something goes wrong.'})
            }
        } 
    } else {
        res.send({success: false, msg: 'Insufficient money, try mine some block to earn money'})
    }


    
})

app.post('/mine', (req, res) => {
    const result = mine()
    res.send({success: true, mineResult: result})
})

app.post('/mine/ghost', (req, res) => {
    const result = mineGhost()
    res.send({success: true, mineResult: result})
})

// Get the blockchain instance as json
app.get('/blockchain', (req, res) => {
    res.send({success: true, blockchain: myMainChain})
})

app.post('/blockchain', (req, res) => {
    isSyncChain = true
    // sendMessage(MsgType.requestInfo, MY_ADDRESS)
    sendMessage(MsgType.requestChain, MY_ADDRESS, myMainChain.syncThreshold)   
    res.send({success: true, msg: 'sync started'})
})

// ====== Following tasks should do it automatically ===== /

// Not sure what's check, looks like part of consensus
// to sync the chain
// app.patch('/check', (req, res) => {
//     sendMessage(MsgType.requestCheck, MY_ADDRESS)
//     res.send({msg: 'Request check, latest block, pendingTransaction, difficulty'})
// })


// // following are Debug use now...
// // Request before mining?
// app.patch('/info', (req, res) => {
//     sendMessage(MsgType.requestInfo, MY_ADDRESS)
//     res.send({msg: 'Request pending transaction and difficulty from other nodes'})
// })

// // Part of consensus I believe.
// app.patch('/blockchain', (req, res) => {
//     isSyncChain = true
//     sendMessage(MsgType.requestChain, MY_ADDRESS)    
//     res.send({msg: 'Request blockchain from other nodes'})
// })


// ====== Express app start =======
app.listen(expressPort, () => {
    console.log(`ExpressJS app listening on port ${expressPort}`)
})
