(() => {
    let definitions = [];

    function createField(definition, savedValues = []) {
        const group = document.createElement('div');
        group.className = 'form-group';
        const label = document.createElement('label');
        label.htmlFor = `customSpecification-${definition.specification_id}`;
        label.textContent = definition.name;

        let input;
        if (definition.input_type === 'select' || definition.input_type === 'boolean') {
            input = document.createElement('select');
            input.add(new Option('Select an option', ''));
            const values = definition.input_type === 'boolean' ? ['Yes', 'No'] : definition.options;
            values.forEach((value) => input.add(new Option(value, value)));
        } else {
            input = document.createElement('input');
            input.type = definition.input_type === 'number' ? 'number' : 'text';
            if (definition.input_type === 'text') input.maxLength = 250;
            if (definition.input_type === 'number') input.step = 'any';
            input.placeholder = `Enter ${definition.name.toLowerCase()}`;
        }

        input.id = `customSpecification-${definition.specification_id}`;
        input.dataset.specificationId = definition.specification_id;
        input.value = savedValues.find((item) => String(item.specification_id) === definition.specification_id)?.value || '';
        group.append(label, input);
        return group;
    }

    window.loadCustomSpecifications = async (savedValues = []) => {
        const response = await fetch('/api/custom-specifications');
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Could not load custom specifications.');
        }
        definitions = result.data;
        const section = document.getElementById('customSpecificationsSection');
        const container = document.getElementById('customSpecificationFields');
        container.replaceChildren();
        definitions.forEach((definition) => container.append(createField(definition, savedValues)));
        section.hidden = definitions.length === 0;
    };

    window.readCustomSpecificationValues = () =>
        definitions.map((definition) => {
            const input = document.getElementById(`customSpecification-${definition.specification_id}`);
            return {
                specification_id: definition.specification_id,
                value: input.value.trim()
            };
        }).filter((item) => item.value);
})();
