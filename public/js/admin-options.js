const message = document.getElementById('message');
const optionActionDialog = document.getElementById('optionActionDialog');
const optionDialogTitle = document.getElementById('optionDialogTitle');
const optionDialogMessage = document.getElementById('optionDialogMessage');
const optionDialogConfirm = document.getElementById('optionDialogConfirm');
const optionRenameField = document.getElementById('optionRenameField');
const optionRenameInput = document.getElementById('optionRenameInput');
optionRenameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        optionDialogConfirm.click();
    }
});
const categories = [
    { type: 'brand', title: 'Laptop brands', description: 'Brands shown when adding and editing laptops.', max: 50 },
    { type: 'processor-brand', title: 'Processor brands', description: 'Processor manufacturers available on laptop forms.', max: 30 },
    { type: 'storage-type', title: 'Storage types', description: 'Storage technologies available on laptop forms.', max: 30 },
    { type: 'condition', title: 'Conditions', description: 'Condition labels available on laptop forms.', max: 20 }
];

function showMessage(text, isError = false) {
    message.textContent = text;
    message.className = `dashboard-message${isError ? ' option-feedback-error' : ''}`;
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Request failed.');
    return result;
}

function showOptionDialog({ title, message, confirmLabel, initialValue = null, danger = true }) {
    optionDialogTitle.textContent = title;
    optionDialogMessage.textContent = message;
    optionDialogConfirm.textContent = confirmLabel;
    optionDialogConfirm.className = danger ? 'modal-delete' : 'modal-primary';
    optionRenameField.hidden = initialValue === null;
    optionRenameInput.value = initialValue ?? '';
    optionRenameInput.maxLength = 60;
    optionActionDialog.returnValue = 'cancel';

    return new Promise((resolve) => {
        optionActionDialog.addEventListener('close', () => {
            resolve({
                confirmed: optionActionDialog.returnValue === 'confirm',
                value: optionRenameInput.value.trim()
            });
        }, { once: true });
        optionActionDialog.showModal();
        if (initialValue !== null) {
            optionRenameInput.focus();
            optionRenameInput.select();
        }
    });
}

async function loadOptions() {
    const [result, customResult] = await Promise.all([
        api('/api/options'),
        api('/api/custom-specifications')
    ]);
    const container = document.getElementById('optionGrid');
    const expandedKeys = new Set(
        Array.from(container.querySelectorAll('details[open][data-option-key]'))
            .map((item) => item.dataset.optionKey)
    );
    container.replaceChildren();

    categories.forEach((category) => {
        const entries = result.data[category.type] || [];
        const card = document.createElement('details');
        card.className = 'option-card option-accordion';
        card.dataset.optionKey = category.type;
        card.open = expandedKeys.has(category.type);
        const summary = document.createElement('summary');
        summary.className = 'option-accordion-summary';
        const title = document.createElement('strong');
        title.textContent = category.title;
        const count = document.createElement('span');
        count.className = 'option-count';
        count.textContent = String(entries.length);
        summary.append(title, count);
        const content = document.createElement('div');
        content.className = 'option-accordion-content';
        const description = document.createElement('p');
        description.textContent = category.description;
        const form = document.createElement('form');
        form.className = 'option-add-form';
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = category.max;
        input.placeholder = `Add ${category.title.toLowerCase().replace(/s$/, '')}`;
        input.setAttribute('aria-label', `New ${category.title.toLowerCase()} option`);
        input.required = true;
        const addButton = document.createElement('button');
        addButton.textContent = 'Add';
        form.append(input, addButton);
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await api(`/api/options/${category.type}`, {
                    method: 'POST', body: JSON.stringify({ name: input.value })
                });
                showMessage(`${category.title.slice(0, -1)} added.`);
                await loadOptions();
            } catch (error) { showMessage(error.message, true); }
        });

        const list = document.createElement('div');
        list.className = 'option-list';
        if (!entries.length) {
            const empty = document.createElement('p');
            empty.className = 'option-empty';
            empty.textContent = 'No options yet.';
            list.append(empty);
        }
        entries.forEach((option) => {
            const row = document.createElement('div');
            row.className = 'option-row';
            const name = document.createElement('strong');
            name.textContent = option.name;
            const actions = document.createElement('div');
            actions.className = 'option-actions';
            const rename = document.createElement('button');
            rename.type = 'button'; rename.className = 'secondary'; rename.textContent = 'Rename';
            rename.addEventListener('click', async () => {
                const answer = await showOptionDialog({
                    title: 'Rename option?',
                    message: `Choose a new name for “${option.name}”. Existing laptop listings will update automatically.`,
                    confirmLabel: 'Save changes',
                    initialValue: option.name,
                    danger: false
                });
                if (!answer.confirmed || !answer.value || answer.value === option.name) return;
                try {
                    await api(`/api/options/${category.type}/${option.id}`, {
                        method: 'PATCH', body: JSON.stringify({ name: answer.value })
                    });
                    showMessage('Option renamed. Existing laptop listings were updated.');
                    await loadOptions();
                } catch (error) { showMessage(error.message, true); }
            });
            const remove = document.createElement('button');
            remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Delete';
            remove.addEventListener('click', async () => {
                const answer = await showOptionDialog({
                    title: 'Delete option?',
                    message: `Are you sure you want to delete “${option.name}”? Options used by laptop listings cannot be deleted.`,
                    confirmLabel: 'Delete option'
                });
                if (!answer.confirmed) return;
                try {
                    await api(`/api/options/${category.type}/${option.id}`, { method: 'DELETE' });
                    showMessage('Option deleted.');
                    await loadOptions();
                } catch (error) { showMessage(error.message, true); }
            });
            actions.append(rename, remove);
            row.append(name, actions);
            list.append(row);
        });
        content.append(description, form, list);
        card.append(summary, content);
        container.append(card);
    });

    const customCard = document.createElement('details');
    customCard.className = 'option-card option-accordion custom-specification-manager';
    customCard.dataset.optionKey = 'custom-specifications';
    customCard.open = expandedKeys.has('custom-specifications');
    const customSummary = document.createElement('summary');
    customSummary.className = 'option-accordion-summary';
    const customHeading = document.createElement('h2');
    customHeading.textContent = 'Custom specifications';
    const customCount = document.createElement('span');
    customCount.className = 'option-count';
    customCount.textContent = String(customResult.data.length);
    customSummary.append(customHeading, customCount);
    const customContent = document.createElement('div');
    customContent.className = 'option-accordion-content';
    const customDescription = document.createElement('p');
    customDescription.textContent = 'Add optional fields such as Battery Capacity or Touchscreen. They will appear on laptop forms and product details.';

    const customForm = document.createElement('form');
    customForm.className = 'option-add-form custom-specification-form';
    const customName = document.createElement('input');
    customName.type = 'text'; customName.maxLength = 60; customName.placeholder = 'Specification name'; customName.required = true;
    customName.setAttribute('aria-label', 'Custom specification name');
    const customType = document.createElement('select');
    customType.setAttribute('aria-label', 'Custom specification type');
    [
        ['text', 'Text'], ['number', 'Number'], ['boolean', 'Yes / No'], ['select', 'Selection list']
    ].forEach(([value, label]) => customType.add(new Option(label, value)));
    const customChoices = document.createElement('input');
    customChoices.type = 'text'; customChoices.maxLength = 1500;
    customChoices.placeholder = 'Choices, separated by commas';
    customChoices.setAttribute('aria-label', 'Selection list choices');
    customChoices.hidden = true;
    const customAddButton = document.createElement('button');
    customAddButton.textContent = 'Add field';
    customType.addEventListener('change', () => {
        customChoices.hidden = customType.value !== 'select';
        customChoices.required = customType.value === 'select';
    });
    customForm.append(customName, customType, customChoices, customAddButton);
    customForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            await api('/api/custom-specifications', {
                method: 'POST',
                body: JSON.stringify({
                    name: customName.value,
                    input_type: customType.value,
                    options: customType.value === 'select'
                        ? customChoices.value.split(',').map((item) => item.trim()).filter(Boolean)
                        : []
                })
            });
            showMessage('Custom specification added.');
            await loadOptions();
        } catch (error) { showMessage(error.message, true); }
    });

    const customList = document.createElement('div');
    customList.className = 'option-list';
    if (!customResult.data.length) {
        const empty = document.createElement('p');
        empty.className = 'option-empty';
        empty.textContent = 'No custom specifications yet.';
        customList.append(empty);
    }
    customResult.data.forEach((specification) => {
        const row = document.createElement('details');
        row.className = 'option-row custom-specification-row';
        row.dataset.optionKey = `custom-${specification.specification_id}`;
        row.open = expandedKeys.has(row.dataset.optionKey);
        const rowSummary = document.createElement('summary');
        rowSummary.className = 'custom-specification-summary';
        const info = document.createElement('div');
        info.className = 'custom-specification-info';
        const name = document.createElement('strong');
        name.textContent = specification.name;
        const typeLabel = document.createElement('span');
        const typeNames = { text: 'Text', number: 'Number', boolean: 'Yes / No', select: 'Selection list' };
        typeLabel.textContent = typeNames[specification.input_type] || specification.input_type;
        info.append(name, typeLabel);
        rowSummary.append(info);
        const expandedDetails = document.createElement('div');
        expandedDetails.className = 'custom-specification-expanded';
        if (specification.input_type === 'select') {
            expandedDetails.classList.add('custom-choice-details');
            const choiceManager = document.createElement('div');
            choiceManager.className = 'custom-choice-manager';
            const choiceList = document.createElement('div');
            choiceList.className = 'custom-choice-list';
            if (!specification.options.length) {
                const emptyChoices = document.createElement('small');
                emptyChoices.className = 'option-empty';
                emptyChoices.textContent = 'No choices yet. Add one below.';
                choiceList.append(emptyChoices);
            }
            specification.options.forEach((option) => {
                const choiceRow = document.createElement('div');
                choiceRow.className = 'custom-choice-row';
                const choiceName = document.createElement('span');
                choiceName.textContent = option;
                const choiceActions = document.createElement('div');
                choiceActions.className = 'option-actions';

                const editChoice = document.createElement('button');
                editChoice.type = 'button';
                editChoice.textContent = 'Rename';
                editChoice.addEventListener('click', async () => {
                    const answer = await showOptionDialog({
                        title: 'Rename choice?',
                        message: `Enter a new name for “${option}”. Existing laptop listings using it will be updated.`,
                        confirmLabel: 'Save choice',
                        initialValue: option,
                        danger: false
                    });
                    if (!answer.confirmed || !answer.value || answer.value === option) return;
                    try {
                        await api(`/api/custom-specifications/${specification.specification_id}/options`, {
                            method: 'PATCH',
                            body: JSON.stringify({ old_option: option, new_option: answer.value })
                        });
                        showMessage('Choice renamed. Existing laptop listings were updated.');
                        await loadOptions();
                    } catch (error) { showMessage(error.message, true); }
                });

                const deleteChoice = document.createElement('button');
                deleteChoice.type = 'button';
                deleteChoice.className = 'danger';
                deleteChoice.textContent = 'Remove';
                deleteChoice.addEventListener('click', async () => {
                    const answer = await showOptionDialog({
                        title: 'Remove choice?',
                        message: `Remove “${option}” from this selection list? Choices used by laptop listings cannot be removed.`,
                        confirmLabel: 'Remove choice'
                    });
                    if (!answer.confirmed) return;
                    try {
                        await api(`/api/custom-specifications/${specification.specification_id}/options`, {
                            method: 'DELETE', body: JSON.stringify({ option })
                        });
                        showMessage('Choice removed.');
                        await loadOptions();
                    } catch (error) { showMessage(error.message, true); }
                });
                choiceActions.append(editChoice, deleteChoice);
                choiceRow.append(choiceName, choiceActions);
                choiceList.append(choiceRow);
            });

            const addChoiceForm = document.createElement('form');
            addChoiceForm.className = 'custom-choice-add-form';
            const addChoiceInput = document.createElement('input');
            addChoiceInput.type = 'text';
            addChoiceInput.maxLength = 50;
            addChoiceInput.placeholder = 'Add a new choice';
            addChoiceInput.setAttribute('aria-label', `New choice for ${specification.name}`);
            addChoiceInput.required = true;
            const addChoiceButton = document.createElement('button');
            addChoiceButton.type = 'submit';
            addChoiceButton.textContent = 'Add choice';
            addChoiceForm.append(addChoiceInput, addChoiceButton);
            addChoiceForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                try {
                    await api(`/api/custom-specifications/${specification.specification_id}/options`, {
                        method: 'POST', body: JSON.stringify({ option: addChoiceInput.value })
                    });
                    showMessage('Choice added.');
                    await loadOptions();
                } catch (error) { showMessage(error.message, true); }
            });

            choiceManager.append(choiceList, addChoiceForm);
            expandedDetails.append(choiceManager);
        } else {
            const typeDescription = document.createElement('small');
            typeDescription.textContent = specification.input_type === 'boolean'
                ? 'Laptop form choices: Yes and No'
                : `Laptop form input: ${typeLabel.textContent}`;
            expandedDetails.append(typeDescription);
        }

        const actions = document.createElement('div');
        actions.className = 'option-actions';
        const rename = document.createElement('button');
        rename.type = 'button'; rename.textContent = 'Rename';
        rename.addEventListener('click', async () => {
            const answer = await showOptionDialog({
                title: 'Rename specification?',
                message: `Choose a new name for “${specification.name}”. Saved laptop values will be preserved.`,
                confirmLabel: 'Save changes',
                initialValue: specification.name,
                danger: false
            });
            if (!answer.confirmed || !answer.value || answer.value === specification.name) return;
            try {
                await api(`/api/custom-specifications/${specification.specification_id}`, {
                    method: 'PATCH', body: JSON.stringify({ name: answer.value })
                });
                showMessage('Specification renamed. Existing laptop values are preserved.');
                await loadOptions();
            } catch (error) { showMessage(error.message, true); }
        });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Delete';
        remove.addEventListener('click', async () => {
            const answer = await showOptionDialog({
                title: 'Delete specification?',
                message: `Are you sure you want to delete “${specification.name}”? Specifications with saved laptop values cannot be deleted.`,
                confirmLabel: 'Delete specification'
            });
            if (!answer.confirmed) return;
            try {
                await api(`/api/custom-specifications/${specification.specification_id}`, { method: 'DELETE' });
                showMessage('Custom specification deleted.');
                await loadOptions();
            } catch (error) { showMessage(error.message, true); }
        });
        actions.append(rename, remove);
        expandedDetails.append(actions);
        row.append(rowSummary, expandedDetails);
        customList.append(row);
    });

    customContent.append(customDescription, customForm, customList);
    customCard.append(customSummary, customContent);
    container.append(customCard);
}

async function initialize() {
    try {
        const auth = await fetch('/api/auth/me');
        if (!auth.ok) return window.location.assign('/admin/login');
        const authResult = await auth.json();
        const username = authResult.admin?.username;
        if (username) document.getElementById('adminUsername').textContent = `Welcome, ${username}`;
        await loadOptions();
    } catch (error) { showMessage(error.message, true); }
}

document.getElementById('sidebarAddLaptopBtn').addEventListener('click', () => {
    window.location.assign('/admin/laptops/new');
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
        window.location.assign('/admin/login');
    }
});

initialize();
