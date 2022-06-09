const WS = require('ws')
const MsgType = require('./MessageType')
const _ = require('lodash');

let opened = []
let wsPort = process.env.PORT || 3000

process.argv.forEach(function (val, index, array) {
    if(index > 1) {
        if(!isNaN(parseInt(val))){            
            wsPort = val
        }
    }
})

const MY_ADDRESS = 'ws://localhost:' + wsPort

function produceMessage(type, data) {
    console.log('Message: ', type)
    return JSON.stringify({type, data})
}

function sendMessage(type, data, threshold=0) {
    message = produceMessage(type, data)    
    
    if(threshold==0) {
        opened.forEach(node => {
            node.socket.send(message)
        })
    } else {
        const peerCount = Math.ceil(opened.length * threshold)
        
        const randomOpened = _.sampleSize(opened, peerCount);
        randomOpened.forEach(node => {
            node.socket.send(message)
        })
    }

}

function connect(address) {
    
    if (!opened.find(peer => peer.address === address) && address !== MY_ADDRESS) {
        
        const socket = new WS(address)        
        socket.on('open', ()=> {
            try {
                socket.send(produceMessage(MsgType.handshake, MY_ADDRESS))
                sendMessage(MsgType.handshake, address)
            }
            catch(err) {
                console.log(err)
            }

            if (!opened.find(peer => peer.address === address) /*&& address !== MY_ADDRESS*/) {
                opened.push({socket, address})
                console.log(`LOG :: Connected to ${address}.`);
            }
        })        

        socket.on('close', () => {
            const openedInstance = opened.find(peer => peer.address === address)
            opened.splice(opened.indexOf(openedInstance), 1)   
            console.log(`LOG :: Disconnected Peer: ${openedInstance.address}.`);         
        })
    }
}

module.exports = {
    opened,
    connect,
    wsPort,
    produceMessage,
    sendMessage,
    MY_ADDRESS
}