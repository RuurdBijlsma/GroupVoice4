class TeamSpeak {
    constructor(ip, room, username) {
        this.ip = ip;
        this.room = room;
        this.username = username;

        this.userList = document.querySelector('.user-list');
        this.users = [];
        this.audioContext = new AudioContext();
        this.initializeConnection();
    }

    async initializeConnection() {
        let stream = await this.getAudioStream();

        this.connection = new RTCConnection(this.room, this.ip, { stream: stream });

        let sayAllowed = false;
        setTimeout(() => {
            sayAllowed = true;
        }, 500);

        this.connection.on('signalServerConnect', () => {
            let user = this.addUser('me');
            user.name = this.username;
            user.stream = stream;
            this.handleStream(user, true);
            this.updateUserList();
            this.say('Connected!');
            console.log("Connected to signal server");
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
            let username = this.getUser(peer._id).name;
            this.say(username + ' disconnected');
            let userIndex = this.users.findIndex(u => u.id === peer._id);
            this.users.splice(userIndex, 1);
            this.updateUserList();
        });
        this.connection.on('message', (data, peer) => {
            let message = JSON.parse(data);
            console.log(`Received message ${getUser(peer._id).name}:${message}`);
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

    async getAudioStream() {
        try {
            return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e) {
            console.log("Could not get microphone access", e);
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

        var gainNode = this.audioContext.createGain();
        var analyser = this.audioContext.createAnalyser();
        var source = this.audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        if (isLocalStream)
            analyser.connect(this.audioContext.destination);

        analyser.fftSize = 2048;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        let intervalTime = 1000 / 5;
        user.interval = setInterval(() => {
            analyser.getByteTimeDomainData(dataArray);
            user.audioData = dataArray;
            let [min, max] = this.domain(dataArray);
            let volume = max - min;
            if (volume > 1)
                this.activateBubble(user, intervalTime);
        }, intervalTime);
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
        let utterance = new SpeechSynthesisUtterance(message);
        speechSynthesis.speak(utterance);
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
}