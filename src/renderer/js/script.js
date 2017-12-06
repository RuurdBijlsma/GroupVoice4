const electron = require('electron').remote;
const path = require('path');
const utils = electron.require(path.resolve(__dirname, '../node/utils.js'));
const app = electron.app;
const mainWindow = electron.getCurrentWindow();

//todo: chat maken ez mode
//iets met de rechts panel, canvas met audio grafiekje is wel leuk idk
//mute speakers
//mute microphone
//iets met de settings knop
//emoji panel

document.addEventListener('DOMContentLoaded', init, false);

async function init() {
    mdc.autoInit();
    initializeIconToggles();
    await Store.initialize();
    Settings.initialize();
    Dialog.initialize(document.querySelector('.prompt'));

    document.addEventListener('keypress', e => {
        if (e.key === '-')
            mainWindow.webContents.toggleDevTools();
    });
}

async function connect() {
    let ip = await Dialog.prompt('Server IP', Store.settings.ip || 'https://rtc.ruurdbijlsma.com');
    Store.settings.ip = ip;
    let room = await Dialog.prompt('Room', Store.settings.room || 'default');
    Store.settings.room = room;
    let username = await Dialog.prompt('Username', Store.settings.username || utils.getUsername());
    Store.settings.username = username;

    window.teamSpeak = new TeamSpeak(ip, room, username);
}

function initializeIconToggles() {
    let getActiveIcon = icons => {
        let activeIcon, inactiveIcon;
        if (icons[0].hasAttribute('active')) {
            activeIcon = icons[0];
            inactiveIcon = icons[1];
        } else {
            activeIcon = icons[1];
            inactiveIcon = icons[0];
        }
        return [activeIcon, inactiveIcon];
    }
    for (let button of document.querySelectorAll('[icon-toggle]')) {
        let icons = button.querySelectorAll('i');
        let [activeIcon, inactiveIcon] = getActiveIcon(icons);
        let activeDisplay = activeIcon.style.display;
        inactiveIcon.style.display = 'none';

        button.addEventListener('click', e => {
            let [activeIcon, inactiveIcon] = getActiveIcon(icons);
            console.log(activeIcon.getAttribute('active'), inactiveIcon.getAttribute('active'));
            activeIcon.removeAttribute('active');
            inactiveIcon.setAttribute('active', '');
            inactiveIcon.style.display = activeDisplay;
            activeIcon.style.display = 'none';
        });
    }
}