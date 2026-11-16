
const prisma = require('../config/database');

const getAllLaptops = async (req, res) => {
    try {
        const {
            search,
            brand,
            processor_brand,
            processor_generation,
            ram,
            storage,
            storage_type,
            condition,
            min_price,
            max_price,
            gpu,
            screen_size,
            sort
        } = req.query;

        // Build the database filtering conditions
        const filters = {};

        // Search by model, processor, or graphics card
        if (search) {
            filters.OR = [
                { model: { contains: search } },
                { processor_model: { contains: search } },
                { graphics_card: { contains: search } }
            ];
        }

        if (brand) {
            filters.brand = {
                brand_name: { equals: brand, mode: 'insensitive' }
            };
        }

        if (processor_brand) {
            filters.processor_brand = {
                equals: processor_brand,
                mode: 'insensitive'
            };
        }

        if (processor_generation) {
            filters.processor_generation = Number(processor_generation);
        }

        if (ram) {
            filters.ram_capacity = Number(ram);
        }

        if (storage) {
            filters.storage_capacity = Number(storage);
        }

        if (storage_type) {
            filters.storage_type = {
                equals: storage_type,
                mode: 'insensitive'
            };
        }

        if (condition) {
            filters.condition = {
                equals: condition,
                mode: 'insensitive'
            };
        }

        if (gpu) {
            filters.graphics_card = {
                contains: gpu,
                mode: 'insensitive'
            };
        }

        if (screen_size) {
            filters.screen_size = Number(screen_size);
        }

        // Filter by price range
        if (min_price || max_price) {
            filters.price = {};

            if (min_price) {
                filters.price.gte = Number(min_price);
            }

            if (max_price) {
                filters.price.lte = Number(max_price);
            }
        }

        // Sort by price
        let orderBy = {};

        if (sort === 'price_asc') {
            orderBy = { price: 'asc' };
        } else if (sort === 'price_desc') {
            orderBy = { price: 'desc' };
        }

        // Query the database
        const laptops = await prisma.laptop.findMany({
            where: filters,
            include: {
                brand: true,
                images: true
            },
            orderBy: Object.keys(orderBy).length ? orderBy : undefined
        });

        res.status(200).json({
            success: true,
            count: laptops.length,
            data: laptops
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve laptops'
        });
    }
};


const getLaptopById = async (req, res) => {
    try {
        const { id } = req.params;

        const laptop = await prisma.laptop.findUnique({
            where: {
                laptop_id: BigInt(id)
            },
            include: {
                brand: true,
                images: true
            }
        });

        if (!laptop) {
            return res.status(404).json({
                success: false,
                message: 'Laptop not found'
            });
        }

        res.status(200).json({
            success: true,
            data: laptop
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve laptop'
        });
    }
};




const createLaptop = async (req, res) => {
    try {
        const {
            brand_name,
            model,
            processor_brand,
            processor_model,
            processor_generation,
            ram_capacity,
            storage_capacity,
            storage_type,
            price,
            condition,
            graphics_card,
            screen_size,
            quantity
        } = req.body;

        // Convert incoming values
        const brandName = brand_name.trim();

        const generation =
            processor_generation === '' ||
            processor_generation === null ||
            processor_generation === undefined
                ? null
                : Number(processor_generation);

        const laptopQuantity = quantity === undefined
            ? 1
            : Number(quantity);

        // Basic quantity validation
        if (!Number.isInteger(laptopQuantity) || laptopQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive whole number.'
            });
        }

        // Find or create the brand
        const brand = await prisma.brand.upsert({
            where: {
                brand_name: brandName
            },
            update: {},
            create: {
                brand_name: brandName
            }
        });

        // Prepare the laptop configuration
        const laptopData = {
            brand_id: brand.brand_id,
            model: model.trim(),
            processor_brand: processor_brand.trim(),
            processor_model: processor_model.trim(),
            processor_generation: generation,
            ram_capacity: Number(ram_capacity),
            storage_capacity: Number(storage_capacity),
            storage_type: storage_type.trim(),
            condition: condition.trim(),
            graphics_card: graphics_card.trim(),
            screen_size: Number(screen_size)
        };

        // Function to increase the quantity of an existing laptop
        const increaseExistingQuantity = async () => {
            const existingLaptop = await prisma.laptop.findFirst({
                where: laptopData
            });

            if (!existingLaptop) {
                return null;
            }

            return await prisma.laptop.update({
                where: {
                    laptop_id: existingLaptop.laptop_id
                },
                data: {
                    quantity: {
                        increment: laptopQuantity
                    },
                    availability:
                        existingLaptop.availability === 'Unavailable'
                            ? 'Unavailable'
                            : 'Available'
                },
                include: {
                    brand: true,
                    images: true
                }
            });
        };

        let result;

        try {
            // Try to find or create the laptop
            result = await prisma.$transaction(async (tx) => {
                const existingLaptop = await tx.laptop.findFirst({
                    where: laptopData
                });

                if (existingLaptop) {
                    const updatedLaptop = await tx.laptop.update({
                        where: {
                            laptop_id: existingLaptop.laptop_id
                        },
                        data: {
                            quantity: {
                                increment: laptopQuantity
                            },
                            availability:
                                existingLaptop.availability === 'Unavailable'
                                    ? 'Unavailable'
                                    : 'Available'
                        },
                        include: {
                            brand: true,
                            images: true
                        }
                    });

                    return {
                        laptop: updatedLaptop,
                        created: false
                    };
                }

                const newLaptop = await tx.laptop.create({
                    data: {
                        ...laptopData,
                        price: Number(price),
                        quantity: laptopQuantity,
                        availability: 'Available'
                    },
                    include: {
                        brand: true,
                        images: true
                    }
                });

                return {
                    laptop: newLaptop,
                    created: true
                };
            });

        } catch (error) {
            // P2002 means a unique constraint violation
            if (error.code !== 'P2002') {
                throw error;
            }

            // Another request created the same laptop first.
            // Increase the quantity of that existing listing.
            const updatedLaptop = await increaseExistingQuantity();

            if (!updatedLaptop) {
                throw error;
            }

            result = {
                laptop: updatedLaptop,
                created: false
            };
        }

        // Send the appropriate response
        res.status(result.created ? 201 : 200).json({
            success: true,
            message: result.created
                ? 'Laptop added successfully!'
                : 'Identical laptop found. Existing quantity increased!',
            data: result.laptop
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to add laptop'
        });
    }
};



const updateLaptop = async (req, res) => {
    try {
        const id = BigInt(req.params.id);

        const {
            brand_name,
            model,
            processor_brand,
            processor_model,
            processor_generation,
            ram_capacity,
            storage_capacity,
            storage_type,
            price,
            condition,
            graphics_card,
            screen_size,
            quantity,
            availability
        } = req.body;

        // Check whether the laptop exists
        const existingLaptop = await prisma.laptop.findUnique({
            where: { laptop_id: id }
        });

        if (!existingLaptop) {
            return res.status(404).json({
                success: false,
                message: 'Laptop not found'
            });
        }

        // Find or create the brand if brand_name was provided
        let brandId = existingLaptop.brand_id;

        if (brand_name) {
            const brand = await prisma.brand.upsert({
                where: { brand_name: brand_name.trim() },
                update: {},
                create: { brand_name: brand_name.trim() }
            });

            brandId = brand.brand_id;
        }

        // Build update data using only provided fields
        const data = {
            ...(brand_name !== undefined && { brand_id: brandId }),
            ...(model !== undefined && { model }),
            ...(processor_brand !== undefined && { processor_brand }),
            ...(processor_model !== undefined && { processor_model }),
            ...(processor_generation !== undefined && {
                processor_generation: processor_generation === null
                    ? null
                    : Number(processor_generation)
            }),
            ...(ram_capacity !== undefined && {
                ram_capacity: Number(ram_capacity)
            }),
            ...(storage_capacity !== undefined && {
                storage_capacity: Number(storage_capacity)
            }),
            ...(storage_type !== undefined && { storage_type }),
            ...(price !== undefined && { price: Number(price) }),
            ...(condition !== undefined && { condition }),
            ...(graphics_card !== undefined && { graphics_card }),
            ...(screen_size !== undefined && {
                screen_size: Number(screen_size)
            }),
            ...(quantity !== undefined && { quantity: Number(quantity) })
        };

        // Maintain availability based on quantity
        const newQuantity = quantity !== undefined
            ? Number(quantity)
            : existingLaptop.quantity;

        if (newQuantity === 0) {
            data.availability = 'Sold';
        } else if (
            availability === 'Unavailable'
        ) {
            data.availability = 'Unavailable';
        } else {
            data.availability = 'Available';
        }

        const updatedLaptop = await prisma.laptop.update({
            where: { laptop_id: id },
            data,
            include: {
                brand: true,
                images: true
            }
        });

        res.status(200).json({
            success: true,
            message: 'Laptop updated successfully',
            data: updatedLaptop
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to update laptop'
        });
    }
};


const deleteLaptop = async (req, res) => {
    try {
        const id = BigInt(req.params.id);

        // Check whether the laptop exists
        const existingLaptop = await prisma.laptop.findUnique({
            where: {
                laptop_id: id
            }
        });

        if (!existingLaptop) {
            return res.status(404).json({
                success: false,
                message: 'Laptop not found'
            });
        }

        // Delete the laptop
        await prisma.laptop.delete({
            where: {
                laptop_id: id
            }
        });

        res.status(200).json({
            success: true,
            message: 'Laptop deleted successfully'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to delete laptop'
        });
    }
};

module.exports = {
    getAllLaptops,
    getLaptopById,
    createLaptop,
    updateLaptop,
    deleteLaptop
};