const prisma = require('../config/database');
const { cloudinary, isConfigured } = require('../config/cloudinary');

const socialPlatformLabels = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    linkedin: 'LinkedIn',
    x: 'X'
};

const uploadToCloudinary = (file, folder) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
        folder,
        resource_type: 'image',
        unique_filename: true,
        overwrite: false
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(file.buffer);
});

const parseSocialLinks = (value) => {
    if (value === undefined) return undefined;
    const links = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(links) || links.length > 12) {
        throw new Error('Add no more than 12 social links.');
    }

    const usedPlatforms = new Set();
    return links.map((link, index) => {
        let platform = link?.platform;
        let label;
        if (platform === undefined && typeof link?.label === 'string') {
            const legacyLabel = link.label.trim();
            const normalized = legacyLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
            const aliases = { fb: 'facebook', insta: 'instagram', yt: 'youtube', wa: 'whatsapp', twitter: 'x' };
            platform = aliases[normalized] || normalized;
            if (Object.prototype.hasOwnProperty.call(socialPlatformLabels, platform)) {
                label = socialPlatformLabels[platform];
            } else {
                platform = 'other';
                label = legacyLabel;
            }
        } else if (platform === 'other') {
            label = typeof link?.customLabel === 'string' ? link.customLabel.trim() : '';
        } else if (typeof platform === 'string' && Object.prototype.hasOwnProperty.call(socialPlatformLabels, platform)) {
            label = socialPlatformLabels[platform];
        }

        if (!label || label.length > 40) {
            throw new Error(`Social link ${index + 1} needs a platform name between 1 and 40 characters.`);
        }
        if (platform !== 'other' && !Object.prototype.hasOwnProperty.call(socialPlatformLabels, platform)) {
            throw new Error(`Choose a supported platform for social link ${index + 1}, or choose Other.`);
        }
        if (platform !== 'other' && usedPlatforms.has(platform)) {
            throw new Error(`${socialPlatformLabels[platform]} can only be added once.`);
        }
        if (platform !== 'other') usedPlatforms.add(platform);

        const url = typeof link?.url === 'string' ? link.url.trim() : '';
        if (url.length > 500) {
            throw new Error(`Social link ${index + 1} URL is too long.`);
        }

        let parsedUrl;
        try { parsedUrl = new URL(url); } catch (_) {
            throw new Error(`Enter a valid HTTP or HTTPS URL for ${label}.`);
        }
        if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
            throw new Error(`Enter a valid HTTP or HTTPS URL for ${label}.`);
        }
        return { label, url: parsedUrl.toString(), display_order: index };
    });
};

const updateStoreProfile = async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const contactEmail = typeof req.body.contact_email === 'string' ? req.body.contact_email.trim() : '';
    const contactPhone = typeof req.body.contact_phone === 'string' ? req.body.contact_phone.trim() : '';
    const contactAddress = typeof req.body.contact_address === 'string' ? req.body.contact_address.trim() : '';
    const mapsUrlInput = typeof req.body.maps_url === 'string' ? req.body.maps_url.trim() : '';
    const mapEmbedUrlInput = typeof req.body.map_embed_url === 'string' ? req.body.map_embed_url.trim() : '';
    const removeLogo = req.body.removeLogo === 'true';
    let socialLinks;
    let mapsUrl = null;
    let mapEmbedUrl = null;

    if (!name || name.length > 100) {
        return res.status(400).json({ success: false, message: 'Store name must be between 1 and 100 characters.' });
    }
    if (contactEmail && (contactEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) {
        return res.status(400).json({ success: false, message: 'Enter a valid contact email address.' });
    }
    if (contactPhone.length > 40) {
        return res.status(400).json({ success: false, message: 'Contact phone must be 40 characters or fewer.' });
    }
    if (contactAddress.length > 300) {
        return res.status(400).json({ success: false, message: 'Store address must be 300 characters or fewer.' });
    }
    if (mapsUrlInput) {
        if (mapsUrlInput.length > 1000) {
            return res.status(400).json({ success: false, message: 'Map link must be 1,000 characters or fewer.' });
        }
        try {
            const parsedMapsUrl = new URL(mapsUrlInput);
            if (!['http:', 'https:'].includes(parsedMapsUrl.protocol) || parsedMapsUrl.username || parsedMapsUrl.password) {
                throw new Error('invalid map url');
            }
            mapsUrl = parsedMapsUrl.toString();
        } catch (_) {
            return res.status(400).json({ success: false, message: 'Enter a valid map link beginning with http:// or https://.' });
        }
    }
    if (mapEmbedUrlInput) {
        if (mapEmbedUrlInput.length > 2000) {
            return res.status(400).json({ success: false, message: 'Map embed link must be 2,000 characters or fewer.' });
        }
        try {
            const parsedEmbedUrl = new URL(mapEmbedUrlInput);
            const isGoogleMapsEmbed = parsedEmbedUrl.protocol === 'https:' &&
                ['www.google.com', 'maps.google.com'].includes(parsedEmbedUrl.hostname) &&
                parsedEmbedUrl.pathname === '/maps/embed' &&
                !parsedEmbedUrl.username && !parsedEmbedUrl.password;
            if (!isGoogleMapsEmbed) throw new Error('invalid map embed url');
            mapEmbedUrl = parsedEmbedUrl.toString();
        } catch (_) {
            return res.status(400).json({ success: false, message: 'Enter the Google Maps embed URL from the iframe src attribute.' });
        }
    }
    try {
        socialLinks = parseSocialLinks(req.body.socialLinks);
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Social links are invalid.' });
    }
    if (req.file && removeLogo) {
        return res.status(400).json({ success: false, message: 'Choose a new logo or remove the current one, not both.' });
    }
    if (req.file && !isConfigured) {
        return res.status(503).json({ success: false, message: 'Image storage is not configured on the server.' });
    }

    let uploadedAsset;
    let profileSaved = false;
    try {
        if (req.file) uploadedAsset = await uploadToCloudinary(req.file, `stores/${req.store.slug}/profile`);

        const previousLogoId = req.store.logo_public_id;
        const updatedStore = await prisma.$transaction(async (tx) => {
            const store = await tx.store.update({
                where: { store_id: req.storeId },
                data: {
                    name,
                    contact_email: contactEmail || null,
                    contact_phone: contactPhone || null,
                    contact_address: contactAddress || null,
                    maps_url: mapsUrl,
                    map_embed_url: mapEmbedUrl,
                    ...(uploadedAsset ? { logo_url: uploadedAsset.secure_url, logo_public_id: uploadedAsset.public_id } : {}),
                    ...(removeLogo ? { logo_url: null, logo_public_id: null } : {})
                },
                select: { name: true, slug: true, logo_url: true, contact_email: true, contact_phone: true, contact_address: true, maps_url: true, map_embed_url: true }
            });

            if (socialLinks !== undefined) {
                await tx.storeSocialLink.deleteMany({ where: { store_id: req.storeId } });
                if (socialLinks.length) {
                    await tx.storeSocialLink.createMany({
                        data: socialLinks.map((link) => ({ ...link, store_id: req.storeId }))
                    });
                }
            }
            return store;
        });
        profileSaved = true;

        const savedSocialLinks = await prisma.storeSocialLink.findMany({
            where: { store_id: req.storeId },
            orderBy: [{ display_order: 'asc' }, { social_link_id: 'asc' }],
            select: { social_link_id: true, label: true, url: true, display_order: true }
        });

        if ((uploadedAsset || removeLogo) && previousLogoId) {
            try {
                await cloudinary.uploader.destroy(previousLogoId, { resource_type: 'image' });
            } catch (error) {
                console.error('Previous store logo cleanup failed:', error);
            }
        }

        return res.json({ success: true, message: 'Store profile updated.', data: { ...updatedStore, social_links: savedSocialLinks } });
    } catch (error) {
        if (!profileSaved && uploadedAsset?.public_id) {
            await cloudinary.uploader.destroy(uploadedAsset.public_id, { resource_type: 'image' }).catch(() => {});
        }
        console.error('Store profile update error:', error);
        return res.status(500).json({ success: false, message: 'Could not update the store profile.' });
    }
};

module.exports = { updateStoreProfile };
