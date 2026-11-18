
const editLaptopForm = document.getElementById('editLaptopForm');
const message = document.getElementById('message');
const updateBtn = document.getElementById('updateBtn');
const backBtn = document.getElementById('backBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Read the ID from /admin/laptops/:id/edit.
const laptopId = window.location.pathname.match(
    /^\/admin\/laptops\/(\d+)\/edit\/?$/
)?.[1];

// Store the original laptop information
let currentLaptop = null;

// Display messages
function showMessage(text, type = 'error') {
    message.textContent = text;
    message.className = type;
}

// Add an option if the database contains a value
// that is not already in the select element
function setSelectValue(elementId, value) {
    const select = document.getElementById(elementId);

    if (value === null || value === undefined) {
        select.value = '';
        return;
    }

    const stringValue = String(value);

    const optionExists = Array.from(select.options).some(
        option => option.value === stringValue
    );

    if (!optionExists) {
        const option = document.createElement('option');
        option.value = stringValue;
        option.textContent = stringValue;
        select.appendChild(option);
    }

    select.value = stringValue;
}

// Check admin authentication
async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
            window.location.href = '/admin/login';
            return false;
        }

        return true;

    } catch (error) {
        console.error(error);
        window.location.href = '/admin/login';
        return false;
    }
}

// Load laptop information
async function loadLaptop() {
    try {
        const response = await fetch(`/api/laptops/${laptopId}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to load laptop');
        }

        currentLaptop = result.data;

        if (!currentLaptop) {
            throw new Error('Laptop information not found.');
        }

        await window.loadLaptopOptions({
            brand_name: currentLaptop.brand?.brand_name || '',
            processor_brand: currentLaptop.processor_brand,
            storage_type: currentLaptop.storage_type,
            condition: currentLaptop.condition
        });
        await window.loadCustomSpecifications(currentLaptop.specifications || []);

        // Fill in the form
        document.getElementById('brand_name').value =
            currentLaptop.brand?.brand_name || '';

        document.getElementById('model').value =
            currentLaptop.model || '';

        setSelectValue(
            'processor_brand',
            currentLaptop.processor_brand
        );

        document.getElementById('processor_model').value =
            currentLaptop.processor_model || '';

        document.getElementById('processor_generation').value =
            currentLaptop.processor_generation ?? '';

        document.getElementById('ram_capacity').value =
            currentLaptop.ram_capacity;

        document.getElementById('storage_capacity').value =
            currentLaptop.storage_capacity;

        setSelectValue(
            'storage_type',
            currentLaptop.storage_type
        );

        setSelectValue(
            'condition',
            currentLaptop.condition
        );

        document.getElementById('price').value =
            currentLaptop.price;

        document.getElementById('quantity').value =
            currentLaptop.quantity;

        // Availability follows the inventory rules
        const availability =
            Number(currentLaptop.quantity) === 0
                ? 'Sold'
                : currentLaptop.availability;

        setSelectValue(
            'availability',
            availability || 'Available'
        );

    } catch (error) {
        console.error(error);
        showMessage(error.message);
        editLaptopForm.style.display = 'none';
    }
}

// Update laptop
editLaptopForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentLaptop) {
        showMessage('Laptop information is not loaded.');
        return;
    }

    const model = document.getElementById('model').value.trim();
    const processorBrand =
        document.getElementById('processor_brand').value;
    const processorModel =
        document.getElementById('processor_model').value.trim();

    const generationValue =
        document.getElementById('processor_generation').value;

    const ram = Number(
        document.getElementById('ram_capacity').value
    );

    const storage = Number(
        document.getElementById('storage_capacity').value
    );

    const storageType =
        document.getElementById('storage_type').value;

    const condition =
        document.getElementById('condition').value;

    const price = Number(
        document.getElementById('price').value
    );

    const quantity = Number(
        document.getElementById('quantity').value
    );

    const selectedAvailability =
        document.getElementById('availability').value;

    // Basic validation
    if (
        !model ||
        !processorBrand ||
        !processorModel ||
        !storageType ||
        !condition ||
        !Number.isInteger(ram) ||
        ram <= 0 ||
        !Number.isInteger(storage) ||
        storage <= 0 ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(quantity) ||
        quantity < 0 ||
        (
            generationValue !== '' &&
            (
                !Number.isInteger(Number(generationValue)) ||
                Number(generationValue) <= 0
            )
        )
    ) {
        showMessage('Please enter valid laptop information.');
        return;
    }

    // Apply inventory availability rules
    let availability;

    if (quantity === 0) {
        availability = 'Sold';
    } else if (selectedAvailability === 'Unavailable') {
        availability = 'Unavailable';
    } else {
        availability = 'Available';
    }

    const updatedData = {
        brand_name: document.getElementById('brand_name').value,
        model,
        processor_brand: processorBrand,
        processor_model: processorModel,
        processor_generation:
            generationValue === '' ? null : Number(generationValue),
        ram_capacity: ram,
        storage_capacity: storage,
        storage_type: storageType,
        condition,
        price,
        quantity,
        availability,
        specifications: window.readCustomSpecificationValues()
    };

    try {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Updating...';

        showMessage('');

        const response = await fetch(`/api/laptops/${laptopId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Failed to update laptop'
            );
        }

        showMessage('Laptop updated successfully!', 'success');

        // Return to dashboard after successful update
        setTimeout(() => {
            window.location.href = '/admin';
        }, 1200);

    } catch (error) {
        console.error(error);
        showMessage(error.message);

        updateBtn.disabled = false;
        updateBtn.textContent = 'Update Laptop';
    }
});

// Back and Cancel buttons
function returnToDashboard() {
    window.location.href = '/admin';
}

backBtn.addEventListener('click', returnToDashboard);
cancelBtn.addEventListener('click', returnToDashboard);

// Initialize page
async function initializePage() {
    if (!laptopId) {
        showMessage('Invalid laptop URL.');
        updateBtn.disabled = true;
        return;
    }

    const authenticated = await checkAuthentication();

    if (authenticated) {
        await loadLaptop();
    }
}

initializePage();
