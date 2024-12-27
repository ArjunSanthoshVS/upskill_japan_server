const fs = require('fs');
const path = require('path');

const ensureUploadDirs = () => {
    const dirs = [
        path.join(__dirname, '../public/uploads'),
        path.join(__dirname, '../public/uploads/audio'),
        path.join(__dirname, '../public/uploads/audio/voice'),
        path.join(__dirname, '../public/uploads/attachments')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
};

module.exports = ensureUploadDirs; 