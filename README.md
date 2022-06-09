# Simple Blockchain example
The main core is at the `backend` folder. The `demoWeb` is used for viewing the activities of the blockchain in different nodes.

# TODO
- [ ] Better Consensus handling
- [ ] Offline Storage for blockchain data

# WebUI
Debug
>npm run watch

Build for production
>npm run build

output at `dist` folder
And use Live Server to run it

# Setup
install npm packages

```
npm install
```

# Usage
Start a node (default **PORT 3000**)
```
node src/ChainNode.js
```

Start a node with specific port number
```
node src/ChainNode.js 3002
```

Start a node in debug mode
```
node src/ChainNode.js debug
```

Start a node in debug mode with specific port
```
node src/ChainNode.js debug 3002
```

You may want to start multiple nodes.
```
node src/ChainNode.js debug 3001
node src/ChainNode.js debug 3002
node src/ChainNode.js debug 3003
...
```
Make sure you reload/refresh the WebUI to see all the peers/nodes.


### Hardcode the private key with .env
1. create a `.env` file
2. Enter `PRIVATE_KEY=85cfc0a324e04cf6d655c2d5a7834c16cd707c6b3e419c8f2160a67b8cd09f4b`
3. when you start node, it will use the private key in the `.env` file

**Beware that all nodes you start will use same private key**

### Key Generator
```
node src/keygenerator.js
```

### WebSocket Message format
Please note that message are in string type
Message size limit should be default in 100 MiB