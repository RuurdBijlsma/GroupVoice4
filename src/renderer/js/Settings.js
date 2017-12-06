class Settings {
    static initialize() {
        let theme = Store.settings.theme || 'dark';
        let input = document.querySelector('.dark-theme-switch .mdc-switch input');
        input.checked = theme === 'dark';
        input.checked ? this.setDarkTheme() : this.setLightTheme();
    }

    static toggleDarkTheme(e) {
        Store.settings.theme = e.target.checked ? 'dark' : 'light';
        e.target.checked ? this.setDarkTheme() : this.setLightTheme();
    }
    
    static setLightTheme() {
        document.querySelector('html').setAttribute('class', '');
        document.documentElement.style.setProperty('--mdc-theme-background', '#fefefe');
        document.documentElement.style.setProperty('--panel-color', 'rgba(0, 0, 0, 0.015)');
    }
    
    static setDarkTheme() {
        document.querySelector('html').setAttribute('class', 'mdc-theme--dark');
        document.documentElement.style.setProperty('--mdc-theme-background', '#141517');
        document.documentElement.style.setProperty('--panel-color', 'rgba(255, 255, 255, 0.05)');
    }
}