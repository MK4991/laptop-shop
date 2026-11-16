
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define image storage directory
const uploadDirectory = path.join(
    __dirname,
    '../../public/images/laptops'
);

// Create directory if it doesn't exist
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Configure where and how images are stored
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + '-' +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname).toLowerCase();

        cb(null, uniqueName);
    }
});

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
    storage: storage,
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
        {
            extension: '.jpg',
            matches: (header) => header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
        },
        {
            extension: '.png',
            matches: (header) => header.subarray(0, 8).equals(
                Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            )
        },
        {
            extension: '.webp',
            matches: (header) => header.toString('ascii', 0, 4) === 'RIFF' &&
                header.toString('ascii', 8, 12) === 'WEBP'
        }
    ];

    try {
        for (const file of req.files || []) {
            const handle = await fs.promises.open(file.path, 'r');
            const header = Buffer.alloc(12);
            try {
                await handle.read(header, 0, header.length, 0);
            } finally {
                await handle.close();
            }

            const signature = signatures.find((candidate) => candidate.matches(header));
            if (!signature) {
                for (const uploadedFile of req.files || []) {
                    await fs.promises.rm(uploadedFile.path, { force: true });
                }
                return res.status(400).json({
                    success: false,
                    message: 'The uploaded file is not a valid JPEG, PNG, or WebP image.'
                });
            }

            const canonicalFilename =
                path.basename(file.filename, path.extname(file.filename)) + signature.extension;
            const canonicalPath = path.join(uploadDirectory, canonicalFilename);
            if (canonicalPath !== file.path) {
                await fs.promises.rename(file.path, canonicalPath);
                file.filename = canonicalFilename;
                file.path = canonicalPath;
            }
        }

        next();
    } catch (error) {
        for (const file of req.files || []) {
            await fs.promises.rm(file.path, { force: true }).catch(() => {});
        }
        next(error);
    }
};

module.exports = upload;
