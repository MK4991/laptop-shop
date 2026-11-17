
const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');
const { cloudinary, isConfigured } = require('../config/cloudinary');

const uploadDirectory = path.join(
    __dirname,
    '../../public/images/laptops'
);

const uploadToCloudinary = (file, folder) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
        folder,
        resource_type: 'image',
        unique_filename: true,
        overwrite: false
    }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
    });

    stream.end(file.buffer);
});

const deleteCloudinaryAssets = async (assets) => {
    await Promise.allSettled(
        assets.filter((asset) => asset?.public_id).map((asset) =>
            cloudinary.uploader.destroy(asset.public_id, { resource_type: 'image' })
        )
    );
};

const deleteLegacyLocalFile = (imageUrl) => {
    if (!imageUrl || !imageUrl.startsWith('/images/laptops/')) return;

    const filename = path.basename(imageUrl);
    const filePath = path.join(uploadDirectory, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

// Check and convert an ID to BigInt
const parseId = (id) => {
    if (!/^\d+$/.test(id)) {
        return null;
    }

    return BigInt(id);
};

// Upload multiple laptop images
const uploadLaptopImages = async (req, res) => {
    const uploadedFiles = req.files || [];
    const uploadedAssets = [];
    let recordsSaved = false;

    try {
        if (!isConfigured) {
            return res.status(503).json({
                success: false,
                message: 'Image storage is not configured on the server.'
            });
        }

        const laptopId = parseId(req.params.id);

        if (laptopId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid laptop ID.'
            });
        }

        if (uploadedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one image.'
            });
        }

        const primaryIndex = req.body.primaryIndex === undefined
            ? null
            : Number(req.body.primaryIndex);

        if (
            primaryIndex !== null &&
            (
                !Number.isInteger(primaryIndex) ||
                primaryIndex < 0 ||
                primaryIndex >= uploadedFiles.length
            )
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid primary image selection.'
            });
        }

        const laptop = await prisma.laptop.findUnique({
            where: {
                laptop_id: laptopId
            }
        });

        if (!laptop) {
            return res.status(404).json({
                success: false,
                message: 'Laptop not found.'
            });
        }

        for (const file of uploadedFiles) {
            const asset = await uploadToCloudinary(
                file,
                `liq-tecnnologies/laptops/${laptopId}`
            );
            uploadedAssets.push(asset);
        }

        await prisma.$transaction(async (tx) => {
            const existingPrimary = await tx.laptopImage.findFirst({
                where: {
                    laptop_id: laptopId,
                    is_primary: true
                }
            });

            // Remove the old primary designation when
            // the administrator selects a new primary image.
            if (
                existingPrimary &&
                primaryIndex !== null
            ) {
                await tx.laptopImage.updateMany({
                    where: {
                        laptop_id: laptopId,
                        is_primary: true
                    },
                    data: {
                        is_primary: false
                    }
                });
            }

            await tx.laptopImage.createMany({
                data: uploadedAssets.map((asset, index) => ({
                    laptop_id: laptopId,
                    image_url: asset.secure_url,
                    cloudinary_public_id: asset.public_id,
                    is_primary: primaryIndex !== null
                        ? index === primaryIndex
                        : !existingPrimary && index === 0
                }))
            });
        });

        recordsSaved = true;

        const images = await prisma.laptopImage.findMany({
            where: {
                laptop_id: laptopId
            },
            orderBy: {
                image_id: 'asc'
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Laptop images uploaded successfully!',
            data: images
        });

    } catch (error) {
        console.error('Image upload error:', error);

        if (!recordsSaved) {
            await deleteCloudinaryAssets(uploadedAssets);
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to upload laptop images.'
        });
    }
};


// Get all images belonging to a laptop
const getLaptopImages = async (req, res) => {
    try {
        const laptopId = parseId(req.params.id);

        if (laptopId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid laptop ID.'
            });
        }

        const laptop = await prisma.laptop.findUnique({
            where: {
                laptop_id: laptopId
            }
        });

        if (!laptop) {
            return res.status(404).json({
                success: false,
                message: 'Laptop not found.'
            });
        }

        const images = await prisma.laptopImage.findMany({
            where: {
                laptop_id: laptopId
            },
            orderBy: [
                { is_primary: 'desc' },
                { image_id: 'asc' }
            ]
        });

        return res.status(200).json({
            success: true,
            data: images
        });

    } catch (error) {
        console.error('Get laptop images error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve laptop images.'
        });
    }
};


// Change the primary image
const setPrimaryImage = async (req, res) => {
    try {
        const laptopId = parseId(req.params.id);
        const imageId = parseId(req.params.imageId);

        if (laptopId === null || imageId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid laptop or image ID.'
            });
        }

        const image = await prisma.laptopImage.findFirst({
            where: {
                image_id: imageId,
                laptop_id: laptopId
            }
        });

        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found for this laptop.'
            });
        }

        await prisma.$transaction(async (tx) => {
            // Remove primary status from all laptop images
            await tx.laptopImage.updateMany({
                where: {
                    laptop_id: laptopId,
                    is_primary: true
                },
                data: {
                    is_primary: false
                }
            });

            // Set the selected image as primary
            await tx.laptopImage.update({
                where: {
                    image_id: imageId
                },
                data: {
                    is_primary: true
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: 'Primary image updated successfully.'
        });

    } catch (error) {
        console.error('Set primary image error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to update primary image.'
        });
    }
};


// Delete a laptop image
const deleteLaptopImage = async (req, res) => {
    try {
        const laptopId = parseId(req.params.id);
        const imageId = parseId(req.params.imageId);

        if (laptopId === null || imageId === null) {
            return res.status(400).json({
                success: false,
                message: 'Invalid laptop or image ID.'
            });
        }

        const image = await prisma.laptopImage.findFirst({
            where: {
                image_id: imageId,
                laptop_id: laptopId
            }
        });

        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found for this laptop.'
            });
        }

        if (image.cloudinary_public_id && !isConfigured) {
            return res.status(503).json({
                success: false,
                message: 'Image storage is not configured on the server.'
            });
        }

        await prisma.$transaction(async (tx) => {
            // Delete the selected image record
            await tx.laptopImage.delete({
                where: {
                    image_id: imageId
                }
            });

            // If the deleted image was primary,
            // promote another image if one exists.
            if (image.is_primary) {
                const nextImage = await tx.laptopImage.findFirst({
                    where: {
                        laptop_id: laptopId
                    },
                    orderBy: {
                        image_id: 'asc'
                    }
                });

                if (nextImage) {
                    await tx.laptopImage.update({
                        where: {
                            image_id: nextImage.image_id
                        },
                        data: {
                            is_primary: true
                        }
                    });
                }
            }
        });

        if (image.cloudinary_public_id) {
            try {
                await cloudinary.uploader.destroy(
                    image.cloudinary_public_id,
                    { resource_type: 'image' }
                );
            } catch (storageError) {
                // The database record is already gone; log orphan cleanup for retry.
                console.error('Cloudinary image cleanup failed:', storageError);
            }
        } else {
            deleteLegacyLocalFile(image.image_url);
        }

        return res.status(200).json({
            success: true,
            message: 'Laptop image deleted successfully.'
        });

    } catch (error) {
        console.error('Delete laptop image error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to delete laptop image.'
        });
    }
};


module.exports = {
    uploadLaptopImages,
    getLaptopImages,
    setPrimaryImage,
    deleteLaptopImage
};
