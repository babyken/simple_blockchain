const EC = require('elliptic').ec
const ec = new EC('secp256k1')

const {CoinbaseTransaction, Transaction} = require('./Transaction')
const Block = require('./Block')
const UTXO = require('./UTXO')

// Mine reward from this mint
const MINT_PRIVATE_ADDRESS =  process.env.MINT_PRIVATE_ADDRESS || '2d44d74f30356a7a25754320ffb5a34be22d9f84671cb9f3ff1b56e5063c6a3a'
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, 'hex')
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex')

class Blockchain {
    constructor() {
        // first chain geneisBlock, add manually
        this.chain = [this.createGenesisBlock()];
        this.pendingTransactions = []
        this.utxo = []
        this.miningReward = 50
        this.difficulty = 2
        this.syncThreshold = 0.6
    }

    createGenesisBlock() {        
        const blk = new Block(0, '1647567618', [], "0")
        blk.hash = Block.calculateHash(blk)
        return blk
    }

    getLatestBlock() {
        return this.chain[this.chain.length -1]
    }  

    // it seems able to change the code in actual blockchain
    // so when others modify the mining reward to earn more
    // it could not be fool and transaction will not be accepted.
    minePendingTransactions(miningRewardAddress) {
        // can't pass ALL transaction in the real world case.
        const rewardTx = new CoinbaseTransaction(miningRewardAddress, this.miningReward)
        rewardTx.signTransaction()
        this.utxo.push(...rewardTx.generateUTXOList())

        let block = new Block(this.getLatestBlock().index+1, Date.now().toString(), [rewardTx, ...this.pendingTransactions], this.getLatestBlock().hash)
        block.mineBlock(this.difficulty)

        console.log('Block successfully mined')
        this.chain.push(block)

        // all local pending transaction has been finalized
        this.pendingTransactions = []
        this.difficulty = this.getDifficulty()

    }

    mineEmptyBlock(miningRewardAddress) {
        const rewardTx = new CoinbaseTransaction(miningRewardAddress, this.miningReward)
        rewardTx.signTransaction()
        
        this.utxo.push(...rewardTx.generateUTXOList())

        let block = new Block(this.getLatestBlock().index+1, Date.now().toString(), [rewardTx], this.getLatestBlock().hash)
        block.mineBlock(this.difficulty)

        console.log('Empty Block successfully mined')
        this.chain.push(block)
        this.difficulty = this.getDifficulty()
        
    }

    getDifficulty(newBlk=null) {  
        const chainLength = newBlk ? this.chain.length + 1 : this.chain.length      
        if(chainLength%3==0 && chainLength-3 != 0) {
            return this.adjustedDifficulty(newBlk)
            //this.difficulty += 1//Math.floor(this.chain.length / 3)
        }
        return this.difficulty        
    }

    adjustedDifficulty(newBlk=null) {
        const timeExpected = 3000 // 0.5 seconds
        // DIFFICULTY_ADJUSTMENT_INTERVAL == 3
        const chainLength = newBlk ? this.chain.length + 1 : this.chain.length      
        const prevAdjBlk = this.chain[chainLength - 3]
        const latestBlk = newBlk || this.getLatestBlock()
        const timeTaken = latestBlk.timestamp - prevAdjBlk.timestamp

        

        const prevBlkHash = prevAdjBlk.hash
        const matchedZero = prevBlkHash.match(/^0+/)
        const prevDiff = matchedZero ? matchedZero[0].length : 0

        if (timeTaken < timeExpected /2) {            
            return prevDiff +1
        } else if (timeTaken > timeExpected * 2) {
            if((prevDiff-1) == 0) return 1
            return prevDiff -1
        }
        
        return  prevDiff


    }

    addTransaction(transaction) {

        if(transaction.outputRec.length == 0) {
            throw new Error('Transaction has no output records')
        }

        if(!transaction.isValid(this)) {
            throw new Error('Cannot add invalid transaction to chain')
        }        

        this.pendingTransactions.push(transaction)
    }

    // balance won't store in address
    // need to loop through the whole train to get the transaction
    getBalanceOfAddress(address) {
        let balance = 0
        // Get record from UTXO ledger
        for (const xo of this.utxo) {            
            if(xo.wallet === address) {
                // if find the blk with correct hash               
                balance += +xo.amount                
            }
        }

        return balance

        // for(const block of this.chain) {
        //     for(const trans of block.transactions) {
        //         if(trans.fromAddress === address) {
        //             balance -= trans.amount
        //         }

        //         if(trans.toAddress === address) {
        //             balance += trans.amount
        //         }
        //     }
        // }

        // return balance
    }

    syncUTXO(inUTXO) {
        for(const xo of inUTXO) {
            if(this.utxo.findIndex(o => o.txId==xo.txId && o.index == xo.index)==-1) {
                // not found and add
                this.utxo.push(xo)
            }
        }        
    }

    // addBlock(newBlock) {
    //     newBlock.previousHash = this.getLatestBlock().hash
    //     newBlock.mineBlock(this.difficulty)

    //     this.chain.push(newBlock)
    // }

    static isChainValid(otherBlockchain, myBlockchain) {
        // need to do error correction if it's not valid?

        // if (myBlockchain.chain.length > otherBlockchain.chain.length) {
        //     return false
        // }

        // start with 1 bcoz 0 is genesis block
        for(let i=1; i<otherBlockchain.chain.length; i++) {
            const currentBlock = otherBlockchain.chain[i]
            const previousBlock = otherBlockchain.chain[i-1]

            if(!Block.hasValidTransactions(currentBlock, otherBlockchain)) {                
                return false
            }

            if (currentBlock.hash !== Block.calculateHash(currentBlock)) {                

                return false
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false
            }            

        }

        return true
    }
}

module.exports = {
    Blockchain,
    MINT_PUBLIC_ADDRESS,
    MINT_KEY_PAIR
}