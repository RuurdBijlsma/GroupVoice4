class Dialog {
    static get hasInitialized() {
        return this._hasInitialized || false;
    }

    static set hasInitialized(value) {
        this._hasInitialized = value;
    }

    static initialize(dialogElement) {
        this.dialogElement = dialogElement;
        this.dialog = new mdc.dialog.MDCDialog(dialogElement);
        this.title = dialogElement.querySelector('.mdc-dialog__header__title');
        this.textField = dialogElement.querySelector('.mdc-text-field input');
        this.textField.addEventListener('keydown', e => {
            if (e.key === 'Enter')
                Dialog.dialog.acceptButton_.click();
        });
        this.dialog.listen('MDCDialog:accept', () => {
            this.onOk();
        });
        this.dialog.listen('MDCDialog:cancel', () => {
            this.onCancel();
        });
    }

    static prompt(question, prefilled = '') {
        this.textField.value = prefilled;
        this.title.innerText = question;
        this.dialog.show();
        setTimeout(() => {
            this.textField.focus();
            this.textField.select();
        }, 200);
        return new Promise((resolve, error) => {
            this.onOk = () => resolve(this.textField.value);
            this.onCancel = () => error('User cancelled dialog');
        });
    }
}