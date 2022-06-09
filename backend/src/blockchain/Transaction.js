const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const crypto = require('crypto')
const SHA256 = message => crypto.createHash("sha256").update(message).digest('hex')
const UTXO = require('./UTXO')

class InputRecord {
    constructor(prevTxId, index, amount, signature='') {
        this.prevTxId = prevTxId
        this.index = index
        this.amount = amount
        this.signature = signature
    }

    calculateHash() {
        return SHA256(this.prevTxId + this.index + this.amount).toString()        
    }    

    signRecord(signingKey) {
        const sig = signingKey.sign(this.calculateHash(), 'base64')
        this.signature = sig.toDER('hex')
    }

    generateUTXO() {        
        return new UTXO(this.prevTxId, this.index, this.amount, this.toAddress)
    }

    static recordsFromJson(inRec) {
        let tmpRec = []
        for(const r of inRec) {            
            tmpRec.push(new InputRecord(r.prevTxId, r.index, r.amount, r.signature))
        }
        return tmpRec
    }
}

class OutputRecord {
    constructor(toAddress, amount) {
        this.toAddress = toAddress
        this.amount = amount
    }

    generateUTXO(txId, index) {        
        return new UTXO(txId, index, this.amount, this.toAddress)
    }

    static recordsFromJson(outRec) {
        let tmpRec = []
        for(const r of outRec) {            
            tmpRec.push(new OutputRecord(r.toAddress, r.amount))
        }
        return tmpRec
    }
}

class Transaction{
    constructor(inputRec=[], outputRec=[], txId=null, timestamp=Date.now().toString()) {        
        this.inputRec = inputRec
        this.outputRec = outputRec
        this.timestamp = timestamp
        this.txId = txId
    }

    calculateHash() {
        return SHA256(JSON.stringify(this.inputRec) + JSON.stringify(this.outputRec) + this.timestamp).toString()        
    }

    // sign with private key
    signTransaction(signingKey) {
        
        for (const rec of this.inputRec) {        
            rec.signRecord(signingKey)
        }

        this.txId = this.calculateHash()



        // public key == wallet address
        // if( signingKey.getPublic('hex') !== this.fromAddress &&
        //     signingKey.getPublic('hex')  !== MINT_PUBLIC_ADDRESS
        //     ) {
        //     throw new Error('You cannot sign transactions for other wallets')
        // }

        // const hashTx = Transaction.calculateHash(this)
        // this.transactionId = hashTx
        // const sig = signingKey.sign(hashTx, 'base64')
        // this.signature = sig.toDER('hex)')
    }

    // verification
    isValid(blockchain){

        let allValid = true        

        // find each prevTxId from block
        for (const rec of this.inputRec) {

            // Find utxo
            // const tmpUtxo = blockchain.utxo.find(xo => xo.txId === rec.prevTxId)
            // console.log(rec.prevTxId)

            // find the block which hold the tx
            const blk = blockchain.chain.find(blk => blk.transactions.find(
                tx => tx.txId == rec.prevTxId
            ))

            // find the tx
            // TODO: Try to improve efficiency
            if(typeof(blk) ==  'undefined') {
                return false
            }

            const transaction =  blk.transactions.find(tx => tx.txId == rec.prevTxId)

            // find the record
            const outputRecord = transaction.outputRec[rec.index]

            // Calculate hash
            const hash = SHA256(transaction.txId + rec.index + outputRecord.amount).toString()
            
            
            const publicKey = ec.keyFromPublic(outputRecord.toAddress, 'hex')
            allValid &= publicKey.verify(hash, rec.signature)            
        }

        return allValid

        // if(!tx.signature || tx.signature.length === 0) {
        //     throw new Error('No signature in this transaction')
        // }

        // // check if coinbase transaction
        // if (tx instanceof CoinbasTransaction) {
        //     return tx.verify(chain)
        // }

        // // check if have enough money before validate the transaction
        // const balance = chain.getBalanceOfAddress(tx.fromAddress)
        // if (balance < tx.amount) {
        //     return false
        // }

        // const publicKey = ec.keyFromPublic(tx.fromAddress, 'hex')
        // return publicKey.verify(Transaction.calculateHash(tx), tx.signature)
    }

    generateUTXOList() {
        let utxoList = []
        
        this.outputRec.forEach((val, index) =>{
            utxoList.push(val.generateUTXO(this.txId, index))
        })
       return utxoList
    }

    generateInputUTXOList() {
        let utxoList = []
        
        this.outputRec.forEach((val, index) =>{
            utxoList.push(val.generateUTXO(this.txId, index))
        })
       return utxoList
    }

    static transactionFromJson(inTx) {
        const inputRec = InputRecord.recordsFromJson(inTx.inputRec)
        const outputRec = OutputRecord.recordsFromJson(inTx.outputRec)
        let newTransaction = new Transaction(inputRec, outputRec, inTx.txId ,inTx.timestamp)
        
        return newTransaction
    }
}

class CoinbaseTransaction extends Transaction {
    constructor(toAddress, reward) {
        const outputRec = new OutputRecord(toAddress, reward)
        super([], [outputRec])
    }

    signTransaction() {
        this.txId = this.calculateHash()
    }

    isValid(blockchain) {
        const tmpUtxo = blockchain.utxo.find(xo => xo.txId == this.txId)
        const outputRecord = this.outputRec[xo.index]
        return (outputRecord.amount == tmpUtxo.amount && outputRecord.toAddress == tmpUtxo.wallet)        
    }
}


module.exports = {
    CoinbaseTransaction,
    Transaction,
    InputRecord,
    OutputRecord
}