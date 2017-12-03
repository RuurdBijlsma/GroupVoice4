class SignalServer {
    constructor(room, ip) {//todo changeroom ofzo maken
        this.socket = io.connect(ip, {secure: true});

        this.socket.on('socketId', id=>{
            this.id = id;
        });

        this.socket.on('connect', async () => {
            await this.createOrJoin(room);
            this.emit('connect');
        });

        this.socket.on('disconnect', () => this.emit('disconnect'));
        this.socket.on('join', peerId => this.emit('join', peerId));
        this.socket.on('signal', (signal, peerId) => this.emit('signal', signal, peerId));

        this.events = {};
    }

    async emitSignalToPeer(signal, peerId) {
        return this.socketEvent('signal', signal, peerId);
    }

    async createOrJoin(room) {
        return this.socketEvent('createOrJoin', room);
    }

    async socketEvent(event, ...args) {
        return new Promise((resolve, error) => {
            this.socket.emit(event, ...args, (success, message) => {
                if (success)
                    resolve(message);
                else
                    error(message);
            });
        });
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