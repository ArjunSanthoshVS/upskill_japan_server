const fs = require('fs');
const path = require('path');

const saveAudioFile = (base64Data, userId) => {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../public/uploads/audio');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
    }

    // Remove the data:audio/wav;base64 prefix
    const base64Audio = base64Data.split(';base64,').pop();
    
    // Generate unique filename
    const filename = `audio_${userId}_${Date.now()}.wav`;
    const filepath = path.join(uploadsDir, filename);
    
    // Save file with proper permissions
    fs.writeFileSync(filepath, base64Audio, { 
        encoding: 'base64',
        mode: 0o644  // Read/write for owner, read for others
    });
    
    // Return the URL path
    return `/uploads/audio/${filename}`;
};

module.exports = { saveAudioFile }; 