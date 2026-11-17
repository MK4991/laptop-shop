const { v2: cloudinary } = require('cloudinary');

const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    hide_sensitive: true
};

const isConfigured = Boolean(
    config.cloud_name && config.api_key && config.api_secret
);

if (isConfigured) {
    cloudinary.config(config);
}

module.exports = { cloudinary, isConfigured };
