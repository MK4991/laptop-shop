
const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');

const uploadDirectory = path.join(
    __dirname,
    '../../public/images/laptops'
);

// Delete uploaded files if an operation fails
const removeUploadedFiles = (files) => {
    for (const file of files || []) {
        const filePath = path.join(uploadDirectory, file.filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
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

    try {
        const laptopId = parseId(req.params.id);

        if (laptopId === null) {
            removeUploadedFiles(uploadedFiles);

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
            removeUploadedFiles(uploadedFiles);

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
            removeUploadedFiles(uploadedFiles);

            return res.status(404).json({
                success: false,
                message: 'Laptop not found.'
            });
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
                data: uploadedFiles.map((file, index) => ({
                    laptop_id: laptopId,
                    image_url: `/images/laptops/${file.filename}`,
                    is_primary: primaryIndex !== null
                        ? index === primaryIndex
                        : !existingPrimary && index === 0
                }))
            });
        });

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

        removeUploadedFiles(uploadedFiles);

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

        // Delete the actual image file from disk
        const filename = path.basename(image.image_url);
        const filePath = path.join(uploadDirectory, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
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
