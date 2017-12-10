class GroupVoice {
    constructor(ip, room, username) {
        this.ip = ip;
        this.room = room;
        this.username = username;
        this.events = {};

        this.userList = document.querySelector('.user-list');
        this.users = [];
        this.audioContext = new AudioContext();
        this.initializeConnection();
    }

    async destroy() {
        for (let user of this.users) {
            if (user.interval !== undefined)
                cancelAnimationFrame(user.interval);
        }
        this.events = {};
        this.users = [];
        console.log('RTC connection destroy call');
        this.connection.destroy();
        this.connection = [];
    }

    async initializeConnection() {
        this.stream = await this.getAudioStream();

        this.connection = new RTCConnection(this.room, this.ip, this.stream ? { stream: this.stream } : {});

        let sayAllowed = false;
        setTimeout(() => {
            sayAllowed = true;
        }, 500);

        this.connection.on('signalServerConnect', () => {
            let user = this.addUser('me');
            user.name = this.username;
            user.stream = this.stream;
            this.handleStream(user, true);
            this.updateUserList();
            this.say('Connected!');
            console.log("Connected to signal server");
            this.emit('connect');
        });
        this.connection.on('signalServerDisconnect', () => {
            this.say('Disconnected');
            console.log("Disconnected from signal server");
        });
        this.connection.on('peerConnect', peer => {
            console.log("Connected to peer");
            let user = this.addUser(peer._id);
            user.peer = peer;
            this.updateUserList();
            this.connection.send(peer, 'username', this.username);
        });
        this.connection.on('peerDisconnect', peer => {
            console.log('peer disconnect call');
            let user = this.getUser(peer._id);
            if (user) {
                this.say(user.name + ' disconnected');
            }
            let userIndex = this.users.findIndex(u => u.id === peer._id);
            this.users.splice(userIndex, 1);
            this.updateUserList();
        });
        this.connection.on('message', (message, peer) => {
            let username = this.getUser(peer._id).name;
            this.emit('message', username, message);
        });
        this.connection.on('username', (name, peer) => {
            console.log('user ' + name + ' joined room');
            if (sayAllowed)
                this.say(name + ' connected');
            let user = this.getUser(peer._id);
            user.name = name;
            this.updateUserList();
        });
        this.connection.on('stream', (stream, peer) => {
            console.log('received stream');
            let user = this.addUser(peer._id);
            user.stream = stream;
            this.handleStream(user);
        });
    }

    toggleMicrophone() {
        if (this.stream.getAudioTracks()[0].enabled)
            this.muteMicrophone();
        else
            this.unmuteMicrophone();
    }

    muteMicrophone() {
        this.stream.getAudioTracks()[0].enabled = false;
    }

    unmuteMicrophone() {
        this.stream.getAudioTracks()[0].enabled = true
    }

    toggleSpeakers() {
        if (this.isMuted)
            this.unmuteSpeakers();
        else
            this.muteSpeakers();
    }

    muteSpeakers() {
        this.isMuted = true;
        this.users.forEach(u => u.gainNode.gain.value = 0);
    }

    unmuteSpeakers() {
        this.isMuted = false;
        this.users.forEach(u => u.gainNode.gain.value = u.gainNode.gain.defaultValue);
    }

    async sendMessage(message) {
        this.connection.broadcast('message', message);
    }

    async getAudioStream() {
        try {
            return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e) {
            console.log("Could not get microphone access", e);
            return false;
        }
    }

    getUser(peerId) {
        return this.users.find(u => u.id === peerId);
    }

    addUser(id) {
        let user = this.getUser(id);
        if (user !== undefined)
            return user;
        user = new User(id);
        this.users.push(user);
        return user;
    }

    visualize(user) {
        this.users.forEach(u => this.resetIntervalListeners(u));

        let canvas = document.querySelector('.voice-visualizer');
        let ctx = canvas.getContext('2d');

        let onResize = () => {
            let { offsetWidth, offsetHeight } = canvas;
            canvas.width = offsetWidth;
            canvas.height = offsetHeight;
        }

        window.addEventListener('resize', () => onResize());
        onResize();

        user.onInterval.push(data => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(0, data[0]);
            for (let i = 1; i < data.length; i++) {
                ctx.lineTo(i, data[i]);
            }
            ctx.stroke();
        });
    }

    handleBubble(user) {
        user.onInterval.push(data => {
            let [min, max] = this.domain(data);
            let volume = max - min;
            if (volume > 1)
                this.activateBubble(user, user.intervalTime);
        });
    }

    resetIntervalListeners(user) {
        user.onInterval = [];
        this.handleBubble(user);
    }

    handleStream(user, isLocalStream = false) {
        let stream = user.stream;

        let element = document.createElement('audio');
        element.setAttribute('autoplay', '');
        element.srcObject = stream;
        element.onloadedmetadata = e => {
            element.play();
            element.muted = true;
        };
        element.style.display = 'none';
        document.body.appendChild(element);

        user.gainNode = this.audioContext.createGain();
        var analyser = this.audioContext.createAnalyser();
        var source = this.audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        // analyser.connect(this.audioContext.destination);
        if (!isLocalStream) {
            analyser.connect(user.gainNode);
            user.gainNode.connect(this.audioContext.destination);
        }
        if (this.isMuted)
            this.muteSpeakers();

        analyser.fftSize = 2048;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        let loop = () => {
            analyser.getByteTimeDomainData(dataArray);
            user.onInterval.forEach(cb => cb(dataArray));

            user.interval = requestAnimationFrame(loop);
        }
        loop();

        this.handleBubble(user);
    }

    activateBubble(user, duration = 100) {
        if (user.hasOwnProperty('timeout'))
            clearTimeout(user.timeout);
        user.bubbleElement.setAttribute('active', '');
        user.timeout = setTimeout(() => {
            user.bubbleElement.removeAttribute('active');
        }, duration);
    }

    avg(arr) {
        return arr.reduce((a, b) => a + b) / arr.length;;
    }

    domain(arr) {
        let min = Infinity,
            max = -Infinity;
        for (let n of arr) {
            if (n > max)
                max = n;

            if (n < min)
                min = n;
        }
        return [min, max];
    }

    say(message) {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
            setTimeout(() => {
                this.say(message);
            }, 50);
        } else {
            let utterance = new SpeechSynthesisUtterance(message);
            speechSynthesis.speak(utterance);
        }
    }

    updateUserList() {
        while (this.userList.hasChildNodes())
            this.userList.removeChild(this.userList.lastChild);
        for (let user of this.users) {
            let li = document.createElement('li');
            let div = document.createElement('div');
            let a = document.createElement('a');
            div.setAttribute('class', 'speak-bubble');
            a.setAttribute('class', 'speak-name');
            a.innerText = user.name;
            li.appendChild(div);
            li.appendChild(a);
            user.bubbleElement = div;
            this.userList.appendChild(li);
        }
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