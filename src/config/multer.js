
const multer = require('multer');

// Allow only specific image formats
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
};

// Configure Multer
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB per image
        files: 5 // Maximum 5 images per laptop
    }
});

upload.handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.code === 'LIMIT_FILE_SIZE'
                ? 'Each image must be 5 MB or smaller.'
                : err.code === 'LIMIT_FILE_COUNT'
                    ? 'You can upload a maximum of 5 images.'
                    : err.message
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next();
};

upload.validateFileSignatures = async (req, res, next) => {
    const signatures = [
        (header) => header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff,
        (header) => header.subarray(0, 8).equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        ),
        (header) => header.toString('ascii', 0, 4) === 'RIFF' &&
            header.toString('ascii', 8, 12) === 'WEBP'
    ];

    const files = [...(req.files || []), ...(req.file ? [req.file] : [])];
    for (const file of files) {
        const header = file.buffer?.subarray(0, 12);
        if (!header || !signatures.some((matches) => matches(header))) {
            return res.status(400).json({
                success: false,
                message: 'The uploaded file is not a valid JPEG, PNG, or WebP image.'
            });
        }
    }

    next();
};

module.exports = upload;
