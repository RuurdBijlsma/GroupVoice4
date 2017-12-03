class Store {
    static async initialize() {
        this.interval = setInterval(() => this.exportToFile(), 1000);
        try {
            let text = await utils.readFile('settings.json');
            this._value = JSON.parse(text);
        } catch (e) {
            console.log("Creating settings.json");
            this._value = {};
            this.exportToFile();
        }
    }

    static get settings() {
        return this._value;
    }

    static set settings(value) {
        this._value = value;
        this.exportToFile();
    }

    static exportToFile() {
        utils.createFile('settings.json', JSON.stringify(this._value));
    }
}