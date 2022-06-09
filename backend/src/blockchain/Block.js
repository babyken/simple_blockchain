const crypto = require('crypto')
const SHA256 = message => crypto.createHash("sha256").update(message).digest('hex')
const {Transaction} = require('./Transaction')

class Block {
    constructor(index, timestamp, transactions, previousHash ='', nonce=0) {
        // header + body?
        this.index = index
        this.timestamp = timestamp        
        
        // Check first transaction is json or transaction object
        if (transactions.length > 0) {        
            if (transactions[0] instanceof Transaction === false) {
                // json
                let tmpTx = []
                for(const tx of transactions) {
                    tmpTx.push(Transaction.transactionFromJson(tx))
                }
                this.transactions = Array.from(tmpTx)                
            } else {
                // array of tx
                this.transactions = transactions
            }
        } else {
            this.transactions = []
        }

        
        this.previousHash = previousHash        
        this.nonce = nonce
        this.hash = Block.calculateHash(this)
    }

    static calculateHash(block) {
        return SHA256(block.index + block.previousHash + block.timestamp + JSON.stringify(block.transactions) + block.nonce).toString()
    }

    mineBlock(difficulty) {
        const arr = Array(difficulty+1).join("0")
        // nonce = 0, hash once to test
        this.hash = Block.calculateHash(this)
        while(this.hash.substring(0, difficulty) !== arr) {            
            this.nonce++;
            this.hash = Block.calculateHash(this)
        }

        console.log("Block mined " + this.hash)
    }

    static hasValidTransactions(block, chain) {
        for(const tx of block.transactions) {

            if(!tx.isValid(chain)) {

                // indicate which is false
                return false
            }

        }
        return true
    }

    static blockFromJson(inBlk) {
        const blk = new Block(   inBlk.index, 
            inBlk.timestamp, 
            inBlk.transactions, 
            inBlk.previousHash, 
            inBlk.nonce)
        blk.hash = Block.calculateHash(blk)
        return blk
    }
}

module.exports = Block