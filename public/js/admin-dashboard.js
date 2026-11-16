
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

let laptops = [];

// Check whether admin is logged in
async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
            window.location.href = '/admin/login';
            return false;
        }

        const result = await response.json();

        adminUsername.textContent =
            `Welcome, ${result.admin.username}`;

        return true;

    } catch (error) {
        console.error(error);
        window.location.href = '/admin/login';
        return false;
    }
}

// Update dashboard statistics
function updateDashboardStatistics() {
    const totalModels = laptops.length;

    const availableModels = laptops.filter(
        laptop =>
            laptop.availability === 'Available' &&
            Number(laptop.quantity) > 0
    ).length;

    const totalUnits = laptops.reduce(
        (total, laptop) =>
            total + Number(laptop.quantity),
        0
    );

    const unavailableModels = laptops.filter(
        laptop =>
            laptop.availability !== 'Available' ||
            Number(laptop.quantity) === 0
    ).length;

    totalModelsElement.textContent = totalModels;
    availableModelsElement.textContent = availableModels;
    totalUnitsElement.textContent = totalUnits;
    unavailableModelsElement.textContent = unavailableModels;
}

// Retrieve laptops from the API
async function loadLaptops() {
    try {
        const response = await fetch('/api/laptops');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Failed to load laptops'
            );
        }

        laptops = result.data;

        // Update statistics
        updateDashboardStatistics();

        laptopTableBody.innerHTML = '';

        if (laptops.length === 0) {
            laptopTableBody.innerHTML = `
                <tr>
                    <td colspan="10">No laptops found.</td>
                </tr>
            `;
            return;
        }

        laptops.forEach(laptop => {
            const row = document.createElement('tr');

            const addCell = (value) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            };

            addCell(laptop.laptop_id);
            addCell(laptop.brand?.brand_name || 'Unknown brand');
            addCell(laptop.model);
            addCell(laptop.processor_model);
            addCell(`${laptop.ram_capacity} GB`);
            addCell(`${laptop.storage_capacity} GB ${laptop.storage_type}`);
            addCell(laptop.condition);
            addCell(`${Number(laptop.price).toLocaleString()} ETB`);
            addCell(laptop.quantity);

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
                <td colspan="10">Failed to load inventory.</td>
            </tr>
        `;

        console.error(error);
    }
}

// Open the Edit Laptop page
function editLaptop(id) {
    window.location.href = `/admin/laptops/${id}/edit`;
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
        const response = await fetch(`/api/laptops/${id}`, {
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
            `/admin/laptops/${id}/images`;
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Logout failed.');
        }

        window.location.href = '/admin/login';

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});

// Add laptop buttons
function openAddLaptopPage() {
    window.location.href = '/admin/laptops/new';
}

addLaptopBtn.addEventListener('click', openAddLaptopPage);

sidebarAddLaptopBtn.addEventListener(
    'click',
    openAddLaptopPage
);

// Initialize dashboard
async function initDashboard() {
    const authenticated = await checkAuthentication();

    if (authenticated) {
        await loadLaptops();
    }
}

initDashboard();
