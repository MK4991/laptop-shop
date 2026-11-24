(() => {
    const selectConfiguration = {
        brand_name: ['brand', 'Select brand'],
        processor_brand: ['processor-brand', 'Select processor brand'],
        storage_type: ['storage-type', 'Select storage type'],
        condition: ['condition', 'Select condition']
    };

    window.loadLaptopOptions = async (selected = {}) => {
        const response = await fetch(storeApi('/options'));
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Could not load configured options.');
        }

        Object.entries(selectConfiguration).forEach(([elementId, [type, placeholder]]) => {
            const select = document.getElementById(elementId);
            if (!select) return;
            const chosenName = selected[elementId] || '';
            select.replaceChildren(new Option(placeholder, ''));
            (result.data[type] || []).forEach((option) => {
                select.add(new Option(option.name, option.name));
            });
            select.value = chosenName;
        });

        return result.data;
    };
})();
