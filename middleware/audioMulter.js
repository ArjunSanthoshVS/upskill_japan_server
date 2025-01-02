const multer = require('multer');
const path = require('path');
// Configure storage for audio files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads/audio'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '.wav'); // Using .wav extension for audio files
    }
});

// File filter for audio files
const fileFilter = (req, file, cb) => {
    // Accept audio files
    const allowedMimes = [
        'audio/wav',
        'audio/mpeg',
        'audio/webm',
        'audio/ogg'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid audio file type'), false);
    }
};

// Export configured multer for audio
module.exports = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for audio files
    }
}); 