const prisma = require('../config/database');

const inputTypes = new Set(['text', 'number', 'select', 'boolean']);

function formatSpecification(record) {
    return {
        specification_id: record.specification_id.toString(),
        name: record.name,
        input_type: record.input_type,
        options: Array.isArray(record.options) ? record.options : []
    };
}

function normalizeOptions(options) {
    if (!Array.isArray(options)) return null;
    const cleaned = [...new Set(options.map((item) => typeof item === 'string' ? item.trim() : ''))];
    if (cleaned.length < 1 || cleaned.length > 30 || cleaned.some((item) => !item || item.length > 50)) return null;
    return cleaned;
}

const list = async (req, res) => {
    try {
        const definitions = await prisma.customSpecification.findMany({ where: { store_id: req.storeId }, orderBy: { name: 'asc' } });
        res.json({ success: true, data: definitions.map(formatSpecification) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to load custom specifications.' });
    }
};

const create = async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const inputType = req.body.input_type;
    const options = inputType === 'select' ? normalizeOptions(req.body.options) : [];
    if (!name || name.length > 60 || !inputTypes.has(inputType) || (inputType === 'select' && !options)) {
        return res.status(400).json({
            success: false,
            message: 'Enter a name and choose a valid field type. Selection lists need 1 to 30 choices, each up to 50 characters.'
        });
    }
    try {
        const definition = await prisma.customSpecification.create({
            data: { store_id: req.storeId, name, input_type: inputType, options }
        });
        res.status(201).json({ success: true, data: formatSpecification(definition) });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'A custom specification with that name already exists.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to add custom specification.' });
    }
};

const rename = async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 60 || !/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Enter a valid name.' });
    }
    try {
        const definition = await prisma.customSpecification.update({
            where: { specification_id: BigInt(req.params.id), store_id: req.storeId }, data: { name }
        });
        res.json({ success: true, data: formatSpecification(definition) });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'A custom specification with that name already exists.' });
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Custom specification not found.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to rename custom specification.' });
    }
};

const remove = async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid specification ID.' });
    try {
        await prisma.customSpecification.delete({ where: { specification_id: BigInt(req.params.id), store_id: req.storeId } });
        res.json({ success: true, message: 'Custom specification deleted.' });
    } catch (error) {
        if (error.code === 'P2003' || error.code === 'P2014') return res.status(409).json({ success: false, message: 'This specification already has values on laptop listings and cannot be deleted.' });
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Custom specification not found.' });
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to delete custom specification.' });
    }
};

function validId(id) {
    return /^\d{1,18}$/.test(id);
}

async function findSelectionSpecification(id, storeId) {
    if (!validId(id)) return null;
    const definition = await prisma.customSpecification.findFirst({
        where: { specification_id: BigInt(id), store_id: storeId }
    });
    return definition?.input_type === 'select' ? definition : null;
}

const addChoice = async (req, res) => {
    const option = typeof req.body.option === 'string' ? req.body.option.trim() : '';
    if (!validId(req.params.id) || !option || option.length > 50) {
        return res.status(400).json({ success: false, message: 'Enter a choice up to 50 characters long.' });
    }
    try {
        const definition = await findSelectionSpecification(req.params.id, req.storeId);
        if (!definition) return res.status(404).json({ success: false, message: 'Selection-list specification not found.' });
        const options = Array.isArray(definition.options) ? definition.options : [];
        if (options.includes(option)) return res.status(409).json({ success: false, message: 'That choice already exists.' });
        if (options.length >= 30) return res.status(400).json({ success: false, message: 'A selection list can contain up to 30 choices.' });
        const updated = await prisma.customSpecification.update({
            where: { specification_id: definition.specification_id, store_id: req.storeId },
            data: { options: [...options, option] }
        });
        res.status(201).json({ success: true, data: formatSpecification(updated) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to add choice.' });
    }
};

const renameChoice = async (req, res) => {
    const oldOption = typeof req.body.old_option === 'string' ? req.body.old_option.trim() : '';
    const newOption = typeof req.body.new_option === 'string' ? req.body.new_option.trim() : '';
    if (!validId(req.params.id) || !oldOption || !newOption || newOption.length > 50) {
        return res.status(400).json({ success: false, message: 'Enter a valid new choice, up to 50 characters.' });
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            const definition = await tx.customSpecification.findFirst({
                where: { specification_id: BigInt(req.params.id), store_id: req.storeId }
            });
            if (!definition || definition.input_type !== 'select') return { error: 'missing' };
            const options = Array.isArray(definition.options) ? definition.options : [];
            if (!options.includes(oldOption)) return { error: 'missing-choice' };
            if (oldOption !== newOption && options.includes(newOption)) return { error: 'duplicate' };
            if (oldOption !== newOption) {
                await tx.laptopSpecification.updateMany({
                    where: { store_id: req.storeId, specification_id: definition.specification_id, value: oldOption },
                    data: { value: newOption }
                });
            }
            const updated = await tx.customSpecification.update({
                where: { specification_id: definition.specification_id, store_id: req.storeId },
                data: { options: options.map((item) => item === oldOption ? newOption : item) }
            });
            return { definition: updated };
        });
        if (result.error === 'missing') return res.status(404).json({ success: false, message: 'Selection-list specification not found.' });
        if (result.error === 'missing-choice') return res.status(404).json({ success: false, message: 'Choice not found.' });
        if (result.error === 'duplicate') return res.status(409).json({ success: false, message: 'That choice already exists.' });
        res.json({ success: true, data: formatSpecification(result.definition) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to rename choice.' });
    }
};

const deleteChoice = async (req, res) => {
    const option = typeof req.body.option === 'string' ? req.body.option.trim() : '';
    if (!validId(req.params.id) || !option) {
        return res.status(400).json({ success: false, message: 'Choose a valid option to remove.' });
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            const definition = await tx.customSpecification.findFirst({
                where: { specification_id: BigInt(req.params.id), store_id: req.storeId }
            });
            if (!definition || definition.input_type !== 'select') return { error: 'missing' };
            const options = Array.isArray(definition.options) ? definition.options : [];
            if (!options.includes(option)) return { error: 'missing-choice' };
            const usageCount = await tx.laptopSpecification.count({
                where: { store_id: req.storeId, specification_id: definition.specification_id, value: option }
            });
            if (usageCount > 0) return { error: 'in-use' };
            const updated = await tx.customSpecification.update({
                where: { specification_id: definition.specification_id, store_id: req.storeId },
                data: { options: options.filter((item) => item !== option) }
            });
            return { definition: updated };
        });
        if (result.error === 'missing') return res.status(404).json({ success: false, message: 'Selection-list specification not found.' });
        if (result.error === 'missing-choice') return res.status(404).json({ success: false, message: 'Choice not found.' });
        if (result.error === 'in-use') return res.status(409).json({ success: false, message: 'This choice is used by laptop listings and cannot be removed.' });
        res.json({ success: true, data: formatSpecification(result.definition) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to remove choice.' });
    }
};

module.exports = { list, create, rename, remove, addChoice, renameChoice, deleteChoice };
