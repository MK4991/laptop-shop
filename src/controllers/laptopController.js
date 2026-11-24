
const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');
const { cloudinary, isConfigured: isCloudinaryConfigured } = require('../config/cloudinary');

const localLaptopImagesDirectory = path.join(
    __dirname,
    '../../public/images/laptops'
);

const laptopInclude = {
    brand: true,
    images: true,
    specifications: { include: { specification: true } }
};

async function parseCustomSpecificationValues(entries, storeId) {
    if (entries === undefined) return { values: [], error: null };
    if (!Array.isArray(entries) || entries.length > 30) {
        return { values: [], error: 'Provide no more than 30 custom specification values.' };
    }

    const values = [];
    const ids = new Set();
    for (const entry of entries) {
        if (!entry || !/^\d{1,18}$/.test(String(entry.specification_id)) || typeof entry.value !== 'string') {
            return { values: [], error: 'A custom specification value is invalid.' };
        }
        const id = String(entry.specification_id);
        if (ids.has(id)) return { values: [], error: 'A custom specification was provided more than once.' };
        ids.add(id);
        const value = entry.value.trim();
        if (!value) continue;
        if (value.length > 250) return { values: [], error: 'Custom specification values must be 250 characters or fewer.' };
        values.push({ specification_id: BigInt(id), value, number_value: null });
    }

    if (!values.length) return { values, error: null };
    const definitions = await prisma.customSpecification.findMany({
        where: { store_id: storeId, specification_id: { in: values.map((entry) => entry.specification_id) } }
    });
    const definitionMap = new Map(definitions.map((item) => [item.specification_id.toString(), item]));

    for (const entry of values) {
        const definition = definitionMap.get(entry.specification_id.toString());
        if (!definition) return { values: [], error: 'A selected custom specification is no longer available.' };
        if (definition.input_type === 'number' && !Number.isFinite(Number(entry.value))) {
            return { values: [], error: `${definition.name} must be a number.` };
        }
        if (definition.input_type === 'number') {
            entry.number_value = Number(entry.value);
        }
        if (definition.input_type === 'select' && !definition.options.includes(entry.value)) {
            return { values: [], error: `Choose a valid value for ${definition.name}.` };
        }
        if (definition.input_type === 'boolean' && !['Yes', 'No'].includes(entry.value)) {
            return { values: [], error: `Choose Yes or No for ${definition.name}.` };
        }
    }
    return { values, error: null };
}

async function saveCustomSpecificationValues(tx, laptopId, storeId, values, replace = false) {
    if (replace) await tx.laptopSpecification.deleteMany({ where: { laptop_id: laptopId, store_id: storeId } });
    for (const item of values) {
        await tx.laptopSpecification.upsert({
            where: {
                laptop_id_specification_id: {
                    laptop_id: laptopId,
                    specification_id: item.specification_id
                }
            },
            update: { value: item.value, number_value: item.number_value },
            create: {
                laptop_id: laptopId,
                store_id: storeId,
                specification_id: item.specification_id,
                value: item.value,
                number_value: item.number_value
            }
        });
    }
}

function serializeLaptop(laptop) {
    const { specifications: values = [], store_id, ...data } = laptop;
    return {
        ...data,
        images: data.images?.map(({ store_id: imageStoreId, ...image }) => image),
        specifications: values.map(({ specification, value }) => ({
            specification_id: specification.specification_id.toString(),
            name: specification.name,
            input_type: specification.input_type,
            value
        }))
    };
}

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
            sort,
            available_only,
            inventory_status
        } = req.query;
        const storeId = req.storeId;

        const requestedPage = Number.parseInt(req.query.page, 10);
        const requestedPageSize = Number.parseInt(req.query.per_page, 10);
        const requestedPageNumber = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
        const perPage = Number.isInteger(requestedPageSize) && requestedPageSize > 0
            ? Math.min(requestedPageSize, 100)
            : 25;

        // Build the database filtering conditions
        const filters = { store_id: storeId };

        if (available_only === 'true') {
            filters.availability = 'Available';
            filters.quantity = { gt: 0 };
        }

        if (inventory_status === 'available') {
            filters.availability = 'Available';
            filters.quantity = { gt: 0 };
        } else if (inventory_status === 'unavailable') {
            filters.OR = [
                { availability: { not: 'Available' } },
                { quantity: 0 }
            ];
        }

        // Search by brand, model, or processor
        if (search) {
            const searchConditions = [
                { brand: { brand_name: { contains: search, mode: 'insensitive' } } },
                { model: { contains: search, mode: 'insensitive' } },
                { processor_model: { contains: search, mode: 'insensitive' } }
            ];
            if (filters.OR) {
                filters.AND = [...(filters.AND || []), { OR: filters.OR }, { OR: searchConditions }];
                delete filters.OR;
            } else {
                filters.OR = searchConditions;
            }
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

        const customFilterKeys = Object.keys(req.query).filter((key) =>
            /^spec_\d+$/.test(key) || /^spec_(min|max)_\d+$/.test(key)
        );
        const customSpecificationIds = [...new Set(customFilterKeys.map((key) =>
            key.match(/\d+$/)?.[0]
        ).filter((id) => id && id.length <= 18))];

        if (customSpecificationIds.length) {
            const definitions = await prisma.customSpecification.findMany({
                where: {
                    specification_id: {
                        // All filter definitions are scoped to the resolved tenant.
                        in: customSpecificationIds.map((id) => BigInt(id))
                    },
                    store_id: storeId
                }
            });
            const customFilters = [];
            definitions.forEach((definition) => {
                const id = definition.specification_id.toString();
                let valueFilter = null;
                if (definition.input_type === 'number') {
                    const range = {};
                    const min = req.query[`spec_min_${id}`];
                    const max = req.query[`spec_max_${id}`];
                    if (typeof min === 'string' && min.trim() && Number.isFinite(Number(min))) {
                        range.gte = Number(min);
                    }
                    if (typeof max === 'string' && max.trim() && Number.isFinite(Number(max))) {
                        range.lte = Number(max);
                    }
                    if (Object.keys(range).length) valueFilter = { number_value: range };
                } else {
                    const requestedValue = req.query[`spec_${id}`];
                    if (typeof requestedValue === 'string' && requestedValue.trim()) {
                        valueFilter = definition.input_type === 'text'
                            ? { value: { contains: requestedValue.trim(), mode: 'insensitive' } }
                            : { value: requestedValue.trim() };
                    }
                }
                if (valueFilter) {
                    customFilters.push({
                        specifications: {
                            some: {
                                specification_id: definition.specification_id,
                                ...valueFilter
                            }
                        }
                    });
                }
            });
            if (customFilters.length) {
                filters.AND = [...(filters.AND || []), ...customFilters];
            }
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

        // Keep pagination stable when multiple records have the same price.
        let orderBy = [{ laptop_id: 'desc' }];

        if (sort === 'price_asc') {
            orderBy = [{ price: 'asc' }, { laptop_id: 'desc' }];
        } else if (sort === 'price_desc') {
            orderBy = [{ price: 'desc' }, { laptop_id: 'desc' }];
        }

        const [total, statisticsSummary] = await Promise.all([
            prisma.laptop.count({ where: filters }),
            available_only === 'true'
                ? Promise.resolve(null)
                : Promise.all([
                    prisma.laptop.count({ where: { store_id: storeId } }),
                    prisma.laptop.count({ where: { store_id: storeId, availability: 'Available', quantity: { gt: 0 } } }),
                    prisma.laptop.aggregate({ where: { store_id: storeId }, _sum: { quantity: true } }),
                    prisma.laptop.count({
                        where: { store_id: storeId, OR: [{ availability: { not: 'Available' } }, { quantity: 0 }] }
                    })
                ]).then(([totalModels, availableModels, totalUnits, unavailableModels]) => ({
                    totalModels,
                    availableModels,
                    totalUnits: totalUnits._sum.quantity || 0,
                    unavailableModels
                }))
        ]);
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const page = Math.min(requestedPageNumber, totalPages);
        const laptops = await prisma.laptop.findMany({
            where: filters,
            include: { brand: true, images: true },
            orderBy,
            skip: (page - 1) * perPage,
            take: perPage
        });
        const statistics = statisticsSummary;

        res.status(200).json({
            success: true,
            count: total,
            pagination: {
                page,
                perPage,
                total,
                totalPages
            },
            ...(statistics && { statistics }),
            data: laptops.map(({ store_id, images = [], ...laptop }) => ({
                ...laptop,
                images: images.map(({ store_id: imageStoreId, ...image }) => image)
            }))
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve laptops'
        });
    }
};

const getLaptopFilterOptions = async (req, res) => {
    try {
        const [brands, processorBrands, generations, storageTypes, conditions] = await Promise.all([
            prisma.brand.findMany({
                where: { store_id: req.storeId },
                select: { brand_name: true },
                orderBy: { brand_name: 'asc' }
            }),
            prisma.processorBrandOption.findMany({
                where: { store_id: req.storeId },
                select: { option_name: true },
                orderBy: { option_name: 'asc' }
            }),
            prisma.laptop.findMany({
                where: { store_id: req.storeId, processor_generation: { not: null } },
                select: { processor_generation: true },
                distinct: ['processor_generation'],
                orderBy: { processor_generation: 'asc' }
            }),
            prisma.storageTypeOption.findMany({
                where: { store_id: req.storeId },
                select: { option_name: true },
                orderBy: { option_name: 'asc' }
            }),
            prisma.conditionOption.findMany({
                where: { store_id: req.storeId },
                select: { option_name: true },
                orderBy: { option_name: 'asc' }
            })
        ]);
        res.json({
            success: true,
            data: {
                brands: brands.map((brand) => brand.brand_name),
                processorBrands: processorBrands.map((item) => item.option_name),
                processorGenerations: generations.map((item) => item.processor_generation),
                storageTypes: storageTypes.map((item) => item.option_name),
                conditions: conditions.map((item) => item.option_name)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to load laptop filter options.' });
    }
};

const getAdminLaptopFilterOptions = async (req, res) => {
    try {
        const [brands, processorBrands, generations, storageTypes, conditions] = await Promise.all([
            prisma.brand.findMany({
                where: { store_id: req.storeId },
                select: { brand_name: true },
                orderBy: { brand_name: 'asc' }
            }),
            prisma.processorBrandOption.findMany({
                where: { store_id: req.storeId },
                select: { option_name: true },
                orderBy: { option_name: 'asc' }
            }),
            prisma.laptop.findMany({
                where: { store_id: req.storeId, processor_generation: { not: null } },
                select: { processor_generation: true },
                distinct: ['processor_generation'],
                orderBy: { processor_generation: 'asc' }
            }),
            prisma.storageTypeOption.findMany({
                where: { store_id: req.storeId },
                select: { option_name: true },
                orderBy: { option_name: 'asc' }
            }),
            prisma.conditionOption.findMany({
                where: { store_id: req.storeId },
                select: { option_name: true },
                orderBy: { option_name: 'asc' }
            })
        ]);
        res.json({
            success: true,
            data: {
                brands: brands.map((item) => item.brand_name),
                processorBrands: processorBrands.map((item) => item.option_name),
                processorGenerations: generations.map((item) => item.processor_generation),
                storageTypes: storageTypes.map((item) => item.option_name),
                conditions: conditions.map((item) => item.option_name)
            }
        });
    } catch (error) {
        console.error('Admin laptop filter options error:', error);
        res.status(500).json({ success: false, message: 'Failed to load inventory filter options.' });
    }
};


const getLaptopById = async (req, res) => {
    try {
        const { id } = req.params;

        const laptop = await prisma.laptop.findFirst({
            where: { laptop_id: BigInt(id), store_id: req.storeId },
            include: {
                brand: true,
                images: true,
                specifications: { include: { specification: true } }
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
            data: serializeLaptop(laptop)
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
            quantity,
            specifications
        } = req.body;

        const storeId = req.storeId;
        const parsedSpecifications = await parseCustomSpecificationValues(specifications, storeId);
        if (parsedSpecifications.error) {
            return res.status(400).json({ success: false, message: parsedSpecifications.error });
        }

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

        // Look up the configured brand and selected categories
        const [brand, processorBrandOption, storageTypeOption, conditionOption] = await Promise.all([
            prisma.brand.findFirst({ where: { store_id: storeId, brand_name: brandName } }),
            prisma.processorBrandOption.findFirst({ where: { store_id: storeId, option_name: processor_brand.trim() } }),
            prisma.storageTypeOption.findFirst({ where: { store_id: storeId, option_name: storage_type.trim() } }),
            prisma.conditionOption.findFirst({ where: { store_id: storeId, option_name: condition.trim() } })
        ]);
        if (!brand || !processorBrandOption || !storageTypeOption || !conditionOption) {
            return res.status(400).json({
                success: false,
                message: 'Choose a brand, processor brand, storage type, and condition from the configured options.'
            });
        }

        // Prepare the laptop configuration
        const laptopData = {
            store_id: storeId,
            brand_id: brand.brand_id,
            model: model.trim(),
            processor_brand: processor_brand.trim(),
            processor_model: processor_model.trim(),
            processor_generation: generation,
            ram_capacity: Number(ram_capacity),
            storage_capacity: Number(storage_capacity),
            storage_type: storage_type.trim(),
            condition: condition.trim(),
        };

        // Function to increase the quantity of an existing laptop
        const increaseExistingQuantity = async (client = prisma) => {
            const existingLaptop = await client.laptop.findFirst({
                where: laptopData
            });

            if (!existingLaptop) {
                return null;
            }

            return await client.laptop.update({
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
                include: laptopInclude
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
                        include: laptopInclude
                    });

                    await saveCustomSpecificationValues(tx, updatedLaptop.laptop_id, storeId, parsedSpecifications.values);
                    const laptopWithSpecifications = await tx.laptop.findFirst({
                        where: { laptop_id: updatedLaptop.laptop_id, store_id: storeId }, include: laptopInclude
                    });

                    return {
                        laptop: laptopWithSpecifications,
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
                    include: laptopInclude
                });

                await saveCustomSpecificationValues(
                    tx,
                    newLaptop.laptop_id,
                    storeId,
                    parsedSpecifications.values
                );

                const laptopWithSpecifications = await tx.laptop.findFirst({
                    where: { laptop_id: newLaptop.laptop_id, store_id: storeId },
                    include: laptopInclude
                });

                return {
                    laptop: laptopWithSpecifications,
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
            const updatedLaptop = await prisma.$transaction(async (tx) => {
                const updated = await increaseExistingQuantity(tx);
                if (!updated) return null;
                await saveCustomSpecificationValues(tx, updated.laptop_id, storeId, parsedSpecifications.values);
                return tx.laptop.findFirst({ where: { laptop_id: updated.laptop_id, store_id: storeId }, include: laptopInclude });
            });

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
            data: serializeLaptop(result.laptop)
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
        const storeId = req.storeId;

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
            quantity,
            availability,
            specifications
        } = req.body;

        const parsedSpecifications = await parseCustomSpecificationValues(specifications, storeId);
        if (parsedSpecifications.error) {
            return res.status(400).json({ success: false, message: parsedSpecifications.error });
        }

        // Check whether the laptop exists
        const existingLaptop = await prisma.laptop.findFirst({
            where: { laptop_id: id, store_id: storeId }
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
            const brand = await prisma.brand.findFirst({
                where: { store_id: storeId, brand_name: brand_name.trim() }
            });
            if (!brand) {
                return res.status(400).json({ success: false, message: 'Choose a brand from the configured options.' });
            }
            brandId = brand.brand_id;
        }

        const requestedOptions = await Promise.all([
            processor_brand !== undefined
                ? prisma.processorBrandOption.findFirst({ where: { store_id: storeId, option_name: processor_brand.trim() } })
                : true,
            storage_type !== undefined
                ? prisma.storageTypeOption.findFirst({ where: { store_id: storeId, option_name: storage_type.trim() } })
                : true,
            condition !== undefined
                ? prisma.conditionOption.findFirst({ where: { store_id: storeId, option_name: condition.trim() } })
                : true
        ]);
        if (requestedOptions.some((option) => option === null)) {
            return res.status(400).json({ success: false, message: 'Choose processor brand, storage type, and condition from the configured options.' });
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
            ...(quantity !== undefined && { quantity: Number(quantity) })
        };

        // Maintain availability based on quantity
        const newQuantity = quantity !== undefined
            ? Number(quantity)
            : existingLaptop.quantity;

        if (newQuantity === 0) {
            data.availability = 'Sold';
        } else if (
            availability === 'Unavailable' ||
            (availability === undefined && existingLaptop.availability === 'Unavailable')
        ) {
            data.availability = 'Unavailable';
        } else {
            data.availability = 'Available';
        }

        const updatedLaptop = await prisma.$transaction(async (tx) => {
            await tx.laptop.update({ where: { laptop_id: id }, data });
            if (specifications !== undefined) {
                await saveCustomSpecificationValues(tx, id, storeId, parsedSpecifications.values, true);
            }
            return tx.laptop.findFirst({ where: { laptop_id: id, store_id: storeId }, include: laptopInclude });
        });

        res.status(200).json({
            success: true,
            message: 'Laptop updated successfully',
            data: serializeLaptop(updatedLaptop)
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
        const storeId = req.storeId;

        // Check whether the laptop exists
        const existingLaptop = await prisma.laptop.findFirst({
            where: { laptop_id: id, store_id: storeId },
            include: { images: true }
        });

        if (!existingLaptop) {
            return res.status(404).json({
                success: false,
                message: 'Laptop not found'
            });
        }

        const cloudinaryImages = existingLaptop.images.filter(
            (image) => image.cloudinary_public_id
        );
        if (cloudinaryImages.length && !isCloudinaryConfigured) {
            return res.status(503).json({
                success: false,
                message: 'Image storage is not configured on the server.'
            });
        }

        // Delete the laptop
        await prisma.laptop.delete({
            where: { laptop_id: id }
        });

        const cleanupResults = await Promise.allSettled([
            ...cloudinaryImages.map((image) =>
                cloudinary.uploader.destroy(
                    image.cloudinary_public_id,
                    { resource_type: 'image' }
                )
            ),
            ...existingLaptop.images
                .filter((image) => !image.cloudinary_public_id)
                .map((image) => {
                    if (!image.image_url?.startsWith('/images/laptops/')) return;
                    const filePath = path.join(
                        localLaptopImagesDirectory,
                        path.basename(image.image_url)
                    );
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                })
        ]);
        cleanupResults
            .filter((result) => result.status === 'rejected')
            .forEach((result) => console.error('Laptop image cleanup failed:', result.reason));

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
    getLaptopFilterOptions,
    getAdminLaptopFilterOptions,
    getLaptopById,
    createLaptop,
    updateLaptop,
    deleteLaptop
};
