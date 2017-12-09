class RTCConnection {
    constructor(room = 'default', ip = 'http://127.0.0.1:3000', config = {}) {
        this.peers = {};
        this.events = {};
        this.room = room;

        this.signalServer = new SignalServer(room, ip);
        this.signalServer.on('connect', () => this.emit('signalServerConnect'));
        this.signalServer.on('disconnect', () => this.emit('signalServerDisconnect'));

        this.signalServer.on('join', peerId => {
            this.newPeer = this.createPeerWithSocket(true, peerId);
            this.newPeer.on('connect', () => {
                this.peers[peerId] = this.newPeer;
            });
        });

        this.signalServer.on('signal', (signal, peerId) => {
            if (signal.type === 'offer') {
                this.newPeer = this.createPeerWithSocket(false, peerId);
                this.newPeer.on('connect', () => {
                    if (this.peers.hasOwnProperty(peerId))
                        this.peers[peerId].destroy();
                    this.peers[peerId] = this.newPeer;
                });
            }
            this.newPeer.signal(signal);
        });

        this.config = config;
    }

    async destroy() {
        return new Promise(resolve => {

            this.signalServer.socket.close();
            this.signalServer.socket.destroy();
            let peerNum = 0;
            
            for (let peerId in this.peers) {
                peerNum++;
                let peer = this.peers[peerId];
                peer.destroy(e => {
                    peerNum--;
                    if (peerNum === 0) {
                        resolve();
                    }
                });
            }

            this.events = {};
            delete this.signalServer;

        });
    }

    async reconfigureConnection(peerConfig = {}) {
        this.config = peerConfig;

        for (let peerKey in this.peers) {
            peerConfig.initiator = true;
            this.newPeer = this.createPeerWithSocket(true, peerKey);
            this.newPeer.on('connect', () => {
                if (this.peers.hasOwnProperty(peerKey))
                    this.peers[peerKey].destroy();
                this.peers[peerKey] = this.newPeer;
            });
        }
    }

    createPeerWithSocket(initiator, peerId) {
        this.config.initiator = initiator;
        let peer = new SimplePeer(this.config);

        peer.on('signal', signal => this.signalServer.emitSignalToPeer(signal, peerId));
        peer.on('connect', () => this.emit('peerConnect', peer));
        peer.on('close', () => this.emit('peerDisconnect', peer));

        peer.on('data', data => {
            this.emit('raw', data, peer);

            // data example: "5,click,buffer"
            // 5 is length of event name "click"
            // data type: Uint8Array
            const commaCode = 44;
            let commaPosition = data.indexOf(commaCode);
            let eventNameLength = +data.slice(0, commaPosition).toString();
            let eventName = data.slice(commaPosition + 1, commaPosition + 1 + eventNameLength).toString();
            let buffer = data.slice(commaPosition + 2 + eventNameLength);

            this.emit(eventName, buffer.toString(), peer);
        });

        peer.on('stream', stream => this.emit('stream', stream, peer));

        return peer;
    }

    broadcast(event, ...args) {
        Object.values(this.peers).forEach(p => this.send(p, event, ...args));
    }

    send(peer, event, ...args) {
        peer.send([event.length, event, ...args]);
    }

    emit(eventName, ...args) {
        if (this.events.hasOwnProperty(eventName)) {
            for (let callback of this.events[eventName]) {
                callback(...args);
            }
        }
    }

    on(eventName, callback) {
        if (!this.events.hasOwnProperty(eventName)) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    off(eventName, callback) {
        if (this.events.hasOwnProperty(eventName)) {
            this.events[eventName].remove(callback);
        } else {
            console.warn("This event does not exist");
        }
    }
}