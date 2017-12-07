class ChatPanel {
    static initialize(element) {
        this.element = element;
        this.chatHistory = [];
    }

    static stringToColour(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        var colour = '#';
        for (var i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            colour += ('00' + value.toString(16)).substr(-2);
        }
        return colour;
    }

    static get lastMessage() {
        return this.chatHistory[this.chatHistory.length - 1];
    }

    static showMessage(user, message, left = true) {
        console.log('user', user);
        let time = new Date().getTime();
        let element = document.querySelector('.chat-panel');
        let p = document.createElement('p');
        p.setAttribute('class', 'chat-message ' + (left ? 'left' : 'right'));
        let messageHtml = '';
        let shouldShowUsername = this.lastMessage === undefined || this.lastMessage.user !== user;
        console.log(shouldShowUsername, left, this.lastMessage);
        if (shouldShowUsername) {
            messageHtml += `
                <p style="color: ${this.stringToColour(user)}" class='chat-user'>${user}</p>
            `;
        }
        messageHtml += `<p class='chat-text'>${message}</p>`;
        p.innerHTML = messageHtml;
        this.element.appendChild(p);
        this.element.scrollTop = this.element.scrollHeight;

        this.chatHistory.push({
            user: user,
            message: message,
            time: time
        });
    }
}