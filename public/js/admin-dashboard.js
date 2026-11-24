
const laptopTableBody = document.getElementById('laptopTableBody');
const adminUsername = document.getElementById('adminUsername');
const logoutBtn = document.getElementById('logoutBtn');
const addLaptopBtn = document.getElementById('addLaptopBtn');

const confirmationDialog =
    document.getElementById('confirmationDialog');

const confirmationTitle =
    document.getElementById('confirmationTitle');

const confirmationMessage =
    document.getElementById('confirmationMessage');

const dashboardMessage =
    document.getElementById('dashboardMessage');

const sidebarAddLaptopBtn =
    document.getElementById('sidebarAddLaptopBtn');

const totalModelsElement =
    document.getElementById('totalModels');

const availableModelsElement =
    document.getElementById('availableModels');

const totalUnitsElement =
    document.getElementById('totalUnits');

const unavailableModelsElement =
    document.getElementById('unavailableModels');
const inventoryPageInfo = document.getElementById('inventoryPageInfo');
const inventoryPrevious = document.getElementById('inventoryPrevious');
const inventoryNext = document.getElementById('inventoryNext');
const inventorySearch = document.getElementById('inventorySearch');
const inventoryBrand = document.getElementById('inventoryBrand');
const inventoryProcessor = document.getElementById('inventoryProcessor');
const inventoryGeneration = document.getElementById('inventoryGeneration');
const inventoryRam = document.getElementById('inventoryRam');
const inventoryStorage = document.getElementById('inventoryStorage');
const inventoryStorageType = document.getElementById('inventoryStorageType');
const inventoryCondition = document.getElementById('inventoryCondition');
const inventoryAvailability = document.getElementById('inventoryAvailability');
const inventoryMinPrice = document.getElementById('inventoryMinPrice');
const inventoryMaxPrice = document.getElementById('inventoryMaxPrice');
const inventorySort = document.getElementById('inventorySort');
const inventoryCustomFilters = document.getElementById('inventoryCustomFilters');
const clearInventoryFilters = document.getElementById('clearInventoryFilters');
const toggleInventoryFilters = document.getElementById('toggleInventoryFilters');
const inventoryFilterPanel = document.getElementById('inventoryFilterPanel');
const activeFilterCount = document.getElementById('activeFilterCount');

let laptops = [];
let inventoryPage = 1;
let inventoryTotalPages = 1;
const inventoryPageSize = 25;
let customFilterDefinitions = [];
let inventorySearchTimeout;

function updateActiveFilterIndicator() {
    const standardFilters = [
        inventoryBrand, inventoryProcessor, inventoryGeneration, inventoryRam,
        inventoryStorage, inventoryStorageType, inventoryCondition,
        inventoryAvailability, inventoryMinPrice, inventoryMaxPrice
    ];
    const standardCount = standardFilters.filter((control) => control.value.trim() !== '').length;
    const customCount = Array.from(inventoryCustomFilters.querySelectorAll('input, select'))
        .filter((control) => control.value.trim() !== '').length;
    const count = standardCount + customCount;

    activeFilterCount.textContent = count ? `${count} applied` : '';
    activeFilterCount.hidden = count === 0;
    toggleInventoryFilters.classList.toggle('has-active-filters', count > 0);
    toggleInventoryFilters.setAttribute('aria-label', count ? `Filters, ${count} applied` : 'Filters');
}

toggleInventoryFilters.addEventListener('click', () => {
    const expanded = toggleInventoryFilters.getAttribute('aria-expanded') === 'true';
    toggleInventoryFilters.setAttribute('aria-expanded', String(!expanded));
    inventoryFilterPanel.hidden = expanded;
});

function getInventoryFilterParameters() {
    const params = new URLSearchParams();
    const values = [
        ['search', inventorySearch.value.trim()],
        ['brand', inventoryBrand.value],
        ['processor_brand', inventoryProcessor.value],
        ['processor_generation', inventoryGeneration.value],
        ['ram', inventoryRam.value],
        ['storage', inventoryStorage.value],
        ['storage_type', inventoryStorageType.value],
        ['condition', inventoryCondition.value],
        ['inventory_status', inventoryAvailability.value],
        ['min_price', inventoryMinPrice.value],
        ['max_price', inventoryMaxPrice.value],
        ['sort', inventorySort.value]
    ];
    values.forEach(([key, value]) => {
        if (value) params.set(key, value);
    });

    customFilterDefinitions.forEach((definition) => {
        const id = definition.specification_id;
        if (definition.input_type === 'number') {
            const min = inventoryCustomFilters.querySelector(`[data-specification-id="${id}"][data-range-type="min"]`);
            const max = inventoryCustomFilters.querySelector(`[data-specification-id="${id}"][data-range-type="max"]`);
            if (min?.value) params.set(`spec_min_${id}`, min.value);
            if (max?.value) params.set(`spec_max_${id}`, max.value);
        } else {
            const control = inventoryCustomFilters.querySelector(`[data-specification-id="${id}"]`);
            if (control?.value.trim()) params.set(`spec_${id}`, control.value.trim());
        }
    });
    return params;
}

function addFilterOptions(select, values, label) {
    values.forEach((value) => select.add(new Option(label ? label(value) : value, value)));
}

function renderInventoryCustomFilters() {
    inventoryCustomFilters.replaceChildren();
    customFilterDefinitions.forEach((definition) => {
        const group = document.createElement('label');
        group.className = 'inventory-custom-filter';
        group.append(document.createTextNode(definition.name));

        if (definition.input_type === 'number') {
            const range = document.createElement('span');
            range.className = 'inventory-custom-range';
            [['min', 'Min'], ['max', 'Max']].forEach(([type, placeholder]) => {
                const input = document.createElement('input');
                input.type = 'number';
                input.step = 'any';
                input.placeholder = placeholder;
                input.dataset.specificationId = definition.specification_id;
                input.dataset.rangeType = type;
                input.setAttribute('aria-label', `${placeholder} ${definition.name}`);
                input.addEventListener('input', updateActiveFilterIndicator);
                input.addEventListener('change', () => {
                    updateActiveFilterIndicator();
                    loadLaptops(1);
                });
                range.append(input);
            });
            group.append(range);
        } else if (definition.input_type === 'select' || definition.input_type === 'boolean') {
            const select = document.createElement('select');
            select.dataset.specificationId = definition.specification_id;
            select.add(new Option(`All ${definition.name}`, ''));
            (definition.input_type === 'boolean' ? ['Yes', 'No'] : definition.options || [])
                .forEach((value) => select.add(new Option(value, value)));
            select.addEventListener('change', () => {
                updateActiveFilterIndicator();
                loadLaptops(1);
            });
            group.append(select);
        } else {
            const input = document.createElement('input');
            input.type = 'search';
            input.placeholder = `Search ${definition.name}`;
            input.dataset.specificationId = definition.specification_id;
            input.setAttribute('aria-label', `Filter by ${definition.name}`);
            input.addEventListener('input', () => {
                updateActiveFilterIndicator();
                clearTimeout(inventorySearchTimeout);
                inventorySearchTimeout = setTimeout(() => loadLaptops(1), 400);
            });
            group.append(input);
        }
        inventoryCustomFilters.append(group);
    });
}

async function loadInventoryFilterOptions() {
    const [optionsResponse, specsResponse] = await Promise.all([
        fetch(storeApi('/laptops/admin/filters')),
        fetch(storeApi('/custom-specifications'))
    ]);
    const optionsResult = await optionsResponse.json();
    const specsResult = await specsResponse.json();
    if (!optionsResponse.ok || !optionsResult.success) {
        throw new Error(optionsResult.message || 'Could not load inventory filter options.');
    }
    if (!specsResponse.ok || !specsResult.success) {
        throw new Error(specsResult.message || 'Could not load custom specification filters.');
    }
    const options = optionsResult.data;
    addFilterOptions(inventoryBrand, options.brands || []);
    addFilterOptions(inventoryProcessor, options.processorBrands || []);
    addFilterOptions(inventoryGeneration, options.processorGenerations || [], (value) => `Generation ${value}`);
    addFilterOptions(inventoryStorageType, options.storageTypes || []);
    addFilterOptions(inventoryCondition, options.conditions || []);
    customFilterDefinitions = specsResult.data || [];
    renderInventoryCustomFilters();
    updateActiveFilterIndicator();
}

// Check whether admin is logged in
async function checkAuthentication() {
    try {
        const response = await fetch(storeApi('/auth/me'));

        if (!response.ok) {
            window.location.href = storePath('/admin/login');
            return false;
        }

        const result = await response.json();
        if (result.admin?.mustChangePassword) {
            window.location.href = storePath('/admin/change-password');
            return false;
        }
        await loadStoreProfile();

        adminUsername.textContent =
            `Welcome, ${result.admin.username}`;
        document.getElementById('dashboardWelcomeName').textContent = result.admin.username;

        return true;

    } catch (error) {
        console.error(error);
        window.location.href = storePath('/admin/login');
        return false;
    }
}

// Update dashboard statistics
function updateDashboardStatistics(statistics) {
    totalModelsElement.textContent = statistics.totalModels;
    availableModelsElement.textContent = statistics.availableModels;
    totalUnitsElement.textContent = statistics.totalUnits;
    unavailableModelsElement.textContent = statistics.unavailableModels;
}

// Retrieve laptops from the API
async function loadLaptops(page = inventoryPage) {
    try {
        const requestedPage = Math.max(1, Number(page) || 1);
        const params = getInventoryFilterParameters();
        params.set('page', String(requestedPage));
        params.set('per_page', String(inventoryPageSize));
        const response = await fetch(storeApi(`/laptops?${params.toString()}`));
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Failed to load laptops'
            );
        }

        if (
            result.pagination.total > 0 &&
            requestedPage > result.pagination.totalPages
        ) {
            return loadLaptops(result.pagination.totalPages);
        }

        laptops = result.data || [];
        inventoryPage = result.pagination.page;
        inventoryTotalPages = result.pagination.totalPages;

        // Update statistics
        updateDashboardStatistics(result.statistics);
        const first = result.pagination.total === 0
            ? 0
            : ((inventoryPage - 1) * result.pagination.perPage) + 1;
        const last = first === 0 ? 0 : first + laptops.length - 1;
        inventoryPageInfo.textContent = result.pagination.total === 0
            ? 'No laptops match these filters'
            : `Showing ${first}–${last} of ${result.pagination.total} laptops · Page ${inventoryPage} of ${inventoryTotalPages}`;
        inventoryPrevious.disabled = inventoryPage <= 1;
        inventoryNext.disabled = inventoryPage >= inventoryTotalPages;

        laptopTableBody.innerHTML = '';

        if (laptops.length === 0) {
            laptopTableBody.innerHTML = `
                <tr>
                    <td colspan="9">No laptops match these filters.</td>
                </tr>
            `;
            return;
        }

        laptops.forEach(laptop => {
            const row = document.createElement('tr');
            row.dataset.laptopId = laptop.laptop_id;

            const addCell = (value) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            };

            addCell(laptop.brand?.brand_name || 'Unknown brand');
            addCell(laptop.model);
            addCell(laptop.processor_model);
            addCell(`${laptop.ram_capacity} GB`);
            addCell(`${laptop.storage_capacity} GB ${laptop.storage_type}`);
            addCell(laptop.condition);
            addCell(`${Number(laptop.price).toLocaleString()} ETB`);
            const quantityCell = document.createElement('td');
            quantityCell.className = 'inventory-quantity-cell';
            const quantityControl = document.createElement('div');
            quantityControl.className = 'quantity-adjuster';
            const decrement = document.createElement('button');
            decrement.type = 'button';
            decrement.className = 'quantity-adjust-btn';
            decrement.dataset.id = laptop.laptop_id;
            decrement.dataset.change = '-1';
            decrement.disabled = Number(laptop.quantity) <= 0;
            decrement.setAttribute('aria-label', `Decrease ${laptop.model} quantity`);
            decrement.textContent = '−';
            const quantityValue = document.createElement('span');
            quantityValue.className = 'quantity-adjust-value';
            quantityValue.textContent = laptop.quantity;
            quantityValue.setAttribute('aria-live', 'polite');
            const increment = document.createElement('button');
            increment.type = 'button';
            increment.className = 'quantity-adjust-btn';
            increment.dataset.id = laptop.laptop_id;
            increment.dataset.change = '1';
            increment.setAttribute('aria-label', `Increase ${laptop.model} quantity`);
            increment.textContent = '+';
            quantityControl.append(decrement, quantityValue, increment);
            quantityCell.appendChild(quantityControl);
            row.appendChild(quantityCell);

            const actions = document.createElement('td');
            [
                ['edit-btn', 'Edit'],
                ['manage-images-btn', 'Manage Images'],
                ['delete-btn', 'Delete']
            ].forEach(([className, label]) => {
                const button = document.createElement('button');
                button.className = className;
                button.dataset.id = laptop.laptop_id;
                button.textContent = label;
                actions.appendChild(button);
            });
            row.appendChild(actions);

            laptopTableBody.appendChild(row);
        });

    } catch (error) {
        laptopTableBody.innerHTML = `
            <tr>
                <td colspan="9">Failed to load inventory.</td>
            </tr>
        `;

        console.error(error);
        inventoryPageInfo.textContent = 'Could not load inventory pages.';
    }
}

// Open the Edit Laptop page
function editLaptop(id) {
    window.location.href = storePath(`/admin/laptops/${id}/edit`);
}

// Show custom confirmation modal
function showConfirmation(title, message) {
    confirmationTitle.textContent = title;
    confirmationMessage.textContent = message;

    confirmationDialog.returnValue = 'cancel';

    return new Promise((resolve) => {
        confirmationDialog.addEventListener('close', () => {
            resolve(
                confirmationDialog.returnValue === 'confirm'
            );
        }, { once: true });

        confirmationDialog.showModal();
    });
}

// Display dashboard messages
function showDashboardMessage(message, isError = false) {
    dashboardMessage.textContent = message;

    dashboardMessage.style.color = isError
        ? '#dc4545'
        : '#16845b';
}

function showQuantityNotification(cell, message, isError = false) {
    cell.querySelector('.quantity-update-notice')?.remove();
    const notice = document.createElement('span');
    notice.className = `quantity-update-notice${isError ? ' is-error' : ''}`;
    notice.setAttribute('role', isError ? 'alert' : 'status');
    notice.textContent = message;
    cell.appendChild(notice);
    if (!isError) window.setTimeout(() => notice.remove(), 3200);
}

// Delete laptop
// Delete laptop
async function deleteLaptop(id) {

    // Find the selected laptop
    const laptop = laptops.find(
        item => String(item.laptop_id) === String(id)
    );

    if (!laptop) {
        showDashboardMessage(
            'Laptop information could not be found.',
            true
        );
        return;
    }

    const laptopName =
        `${laptop.brand.brand_name} ${laptop.model}`;

    // Show confirmation modal
    const confirmed = await showConfirmation(
        'Delete laptop?',
        `Are you sure you want to delete ${laptopName}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(storeApi(`/laptops/${id}`), {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Failed to delete laptop.'
            );
        }

        showDashboardMessage(
            `${laptopName} was deleted successfully.`
        );

        await loadLaptops();

    } catch (error) {
        console.error(error);

        showDashboardMessage(error.message, true);
    }
}

// Handle table button clicks
laptopTableBody.addEventListener('click', async (event) => {
    const quantityButton = event.target.closest('.quantity-adjust-btn');
    if (quantityButton) {
        const laptop = laptops.find((item) => String(item.laptop_id) === quantityButton.dataset.id);
        if (!laptop) return;
        const nextQuantity = Number(laptop.quantity) + Number(quantityButton.dataset.change);
        if (nextQuantity < 0) return;

        const controls = quantityButton.closest('.quantity-adjuster').querySelectorAll('button');
        controls.forEach((button) => { button.disabled = true; });
        try {
            const response = await fetch(storeApi(`/laptops/${laptop.laptop_id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: nextQuantity })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Could not update laptop quantity.');
            await loadLaptops(inventoryPage);
            const updatedRow = laptopTableBody.querySelector(`tr[data-laptop-id="${laptop.laptop_id}"]`);
            const updatedQuantityCell = updatedRow?.querySelector('.inventory-quantity-cell');
            if (updatedQuantityCell) showQuantityNotification(updatedQuantityCell, 'Quantity saved');
        } catch (error) {
            console.error(error);
            const quantityCell = quantityButton.closest('td');
            showQuantityNotification(quantityCell, error.message, true);
            controls.forEach((button) => { button.disabled = false; });
        }
        return;
    }

    const editButton = event.target.closest('.edit-btn');
    const deleteButton = event.target.closest('.delete-btn');
    const manageImagesButton =
        event.target.closest('.manage-images-btn');

    if (editButton) {
        editLaptop(editButton.dataset.id);
        return;
    }

    if (deleteButton) {
        await deleteLaptop(deleteButton.dataset.id);
        return;
    }

    if (manageImagesButton) {
        const id = manageImagesButton.dataset.id;

        window.location.href =
            storePath(`/admin/laptops/${id}/images`);
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(storeApi('/auth/logout'), {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Logout failed.');
        }

        window.location.href = storePath('/admin/login');

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});

// Add laptop buttons
function openAddLaptopPage() {
    window.location.href = storePath('/admin/laptops/new');
}

addLaptopBtn.addEventListener('click', openAddLaptopPage);

inventoryPrevious.addEventListener('click', () => {
    if (inventoryPage > 1) loadLaptops(inventoryPage - 1);
});

inventoryNext.addEventListener('click', () => {
    if (inventoryPage < inventoryTotalPages) loadLaptops(inventoryPage + 1);
});

document.getElementById('inventoryFilters').addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(inventorySearchTimeout);
    loadLaptops(1);
});

inventorySearch.addEventListener('input', () => {
    clearTimeout(inventorySearchTimeout);
    inventorySearchTimeout = setTimeout(() => loadLaptops(1), 400);
});

[
    inventoryBrand, inventoryProcessor, inventoryGeneration, inventoryRam,
    inventoryStorage, inventoryStorageType, inventoryCondition,
    inventoryAvailability, inventoryMinPrice, inventoryMaxPrice, inventorySort
].forEach((control) => {
    control.addEventListener('input', updateActiveFilterIndicator);
    control.addEventListener('change', () => {
        updateActiveFilterIndicator();
        loadLaptops(1);
    });
});

clearInventoryFilters.addEventListener('click', () => {
    document.getElementById('inventoryFilters').reset();
    inventoryCustomFilters.querySelectorAll('input, select').forEach((control) => {
        control.value = '';
    });
    updateActiveFilterIndicator();
    loadLaptops(1);
});

sidebarAddLaptopBtn.addEventListener(
    'click',
    openAddLaptopPage
);

// Initialize dashboard
async function initDashboard() {
    const authenticated = await checkAuthentication();

    if (authenticated) {
        await loadInventoryFilterOptions();
        await loadLaptops();
    }
}

initDashboard();
