const fs = require('fs');

exports.getUsername = () => require("os").userInfo().username;

exports.readFile = (name, encoding = 'utf8') => {
    return new Promise((resolve, error) => {
        fs.readFile(name, encoding, (err, data) => {
            if (err)
                error(err);
            else
                resolve(data);
        });
    });
}

exports.createFile = (name, content) => {
    return new Promise((resolve, error) => {
        fs.writeFile(name, content, err => {
            if (err)
                error();
            else
                resolve();
        });
    });
};