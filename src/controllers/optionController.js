const prisma = require('../config/database');

const optionTypes = {
    brand: { model: 'brand', id: 'brand_id', name: 'brand_name', max: 50 },
    'processor-brand': { model: 'processorBrandOption', id: 'option_id', name: 'option_name', max: 30 },
    'storage-type': { model: 'storageTypeOption', id: 'option_id', name: 'option_name', max: 30 },
    condition: { model: 'conditionOption', id: 'option_id', name: 'option_name', max: 20 }
};

function getType(type) {
    return optionTypes[type] || null;
}

function normalize(record, descriptor) {
    return { id: record[descriptor.id].toString(), name: record[descriptor.name] };
}

const getOptions = async (req, res) => {
    try {
        const lists = await Promise.all(Object.entries(optionTypes).map(async ([type, descriptor]) => {
            const records = await prisma[descriptor.model].findMany({
                where: { store_id: req.storeId },
                orderBy: { [descriptor.name]: 'asc' }
            });
            return [type, records.map((record) => normalize(record, descriptor))];
        }));
        res.json({ success: true, data: Object.fromEntries(lists) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to load configurable options.' });
    }
};

const createOption = async (req, res) => {
    const descriptor = getType(req.params.type);
    if (!descriptor) return res.status(404).json({ success: false, message: 'Option category not found.' });
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > descriptor.max) {
        return res.status(400).json({ success: false, message: `Enter a name between 1 and ${descriptor.max} characters.` });
    }
    try {
        const record = await prisma[descriptor.model].create({ data: { store_id: req.storeId, [descriptor.name]: name } });
        res.status(201).json({ success: true, data: normalize(record, descriptor) });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'That option already exists.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to add option.' });
    }
};

const renameOption = async (req, res) => {
    const descriptor = getType(req.params.type);
    if (!descriptor) return res.status(404).json({ success: false, message: 'Option category not found.' });
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > descriptor.max) {
        return res.status(400).json({ success: false, message: `Enter a name between 1 and ${descriptor.max} characters.` });
    }
    try {
        const record = await prisma[descriptor.model].update({
            where: { [descriptor.id]: BigInt(req.params.id), store_id: req.storeId },
            data: { [descriptor.name]: name }
        });
        res.json({ success: true, data: normalize(record, descriptor) });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'The new name already exists or would create a duplicate laptop configuration.' });
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Option not found.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to rename option.' });
    }
};

const deleteOption = async (req, res) => {
    const descriptor = getType(req.params.type);
    if (!descriptor) return res.status(404).json({ success: false, message: 'Option category not found.' });
    try {
        await prisma[descriptor.model].delete({ where: { [descriptor.id]: BigInt(req.params.id), store_id: req.storeId } });
        res.json({ success: true, message: 'Option deleted.' });
    } catch (error) {
        if (error.code === 'P2003') return res.status(409).json({ success: false, message: 'This option is used by laptop listings. Reassign those listings before deleting it.' });
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Option not found.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete option.' });
    }
};

module.exports = { getOptions, createOption, renameOption, deleteOption };
