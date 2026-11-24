
const addLaptopForm = document.getElementById('addLaptopForm');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');

const imageInput = document.getElementById('images');
const imagePreview = document.getElementById('imagePreview');

// Store selected image previews
let selectedImages = [];

// Display selected images
imageInput.addEventListener('change', () => {
    const files = Array.from(imageInput.files);

    // Clear previous previews
    selectedImages.forEach(image => URL.revokeObjectURL(image.previewUrl));
    selectedImages = [];
    imagePreview.innerHTML = '';

    // Validate number of images
    if (files.length > 5) {
        message.textContent = 'You can select a maximum of 5 images.';
        message.className = 'error-message';
        imageInput.value = '';
        return;
    }

    // Validate image files
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
            message.textContent = 'Only JPEG, PNG, and WebP images are allowed.';
            message.className = 'error-message';
            imageInput.value = '';
            imagePreview.innerHTML = '<p>No images selected.</p>';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            message.textContent = 'Each image must be 5 MB or smaller.';
            message.className = 'error-message';
            imageInput.value = '';
            imagePreview.innerHTML = '<p>No images selected.</p>';
            return;
        }
    }

    message.textContent = '';
    message.className = '';

    if (files.length === 0) {
        imagePreview.innerHTML = '<p>No images selected.</p>';
        return;
    }

    // Create image previews
    selectedImages = files.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file)
    }));

    selectedImages.forEach((image, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';

        const img = document.createElement('img');
        img.src = image.previewUrl;
        img.alt = `Laptop image ${index + 1}`;

        const label = document.createElement('label');

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'primaryImage';
        radio.value = index;
        radio.checked = index === 0;

        label.appendChild(radio);
        label.appendChild(
            document.createTextNode(' Primary image')
        );

        previewItem.appendChild(img);
        previewItem.appendChild(label);

        imagePreview.appendChild(previewItem);
    });
});

// Upload images after creating the laptop
async function uploadLaptopImages(laptopId) {
    if (selectedImages.length === 0) {
        return;
    }

    const formData = new FormData();

    selectedImages.forEach(image => {
        formData.append('images', image.file);
    });

    // Get selected primary image
    const selectedPrimary = document.querySelector(
        'input[name="primaryImage"]:checked'
    );

    formData.append(
        'primaryIndex',
        selectedPrimary ? selectedPrimary.value : '0'
    );

    const response = await fetch(
        storeApi(`/laptops/${laptopId}/images`),
        {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || 'Failed to upload laptop images.'
        );
    }

    return result;
}

// Submit laptop form
addLaptopForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    message.textContent = '';
    message.className = '';

    const formData = new FormData(addLaptopForm);

    const laptopData = Object.fromEntries(
        formData.entries()
    );

    // Convert numeric values
    laptopData.processor_generation =
        laptopData.processor_generation === ''
            ? null
            : Number(laptopData.processor_generation);

    laptopData.ram_capacity = Number(laptopData.ram_capacity);
    laptopData.storage_capacity = Number(laptopData.storage_capacity);
    laptopData.price = Number(laptopData.price);
    laptopData.quantity = Number(laptopData.quantity);
    laptopData.specifications = window.readCustomSpecificationValues();

    // Remove image input from laptop data
    delete laptopData.images;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving laptop...';

        // Step 1: Create laptop listing
        const response = await fetch(storeApi('/laptops'), {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(laptopData)
        });

        const result = await response.json();

        if (!response.ok) {
            const errorMessage = result.errors
                ? result.errors.map(error => error.msg).join(', ')
                : result.message || 'Failed to add laptop.';

            throw new Error(errorMessage);
        }

        const laptopId = result.data.laptop_id;

        // Step 2: Upload images if selected
        if (selectedImages.length > 0) {
            submitBtn.textContent = 'Uploading images...';

            await uploadLaptopImages(laptopId);
        }

        // Step 3: Show success message
        message.textContent = selectedImages.length > 0
            ? 'Laptop and images saved successfully!'
            : result.message || 'Laptop saved successfully!';

        message.className = 'success-message';

        // Reset form and previews
        addLaptopForm.reset();

        selectedImages.forEach(image => {
            URL.revokeObjectURL(image.previewUrl);
        });

        selectedImages = [];
        imagePreview.innerHTML = '<p>No images selected.</p>';

    } catch (error) {
        console.error('Error:', error);

        message.textContent = error.message;
        message.className = 'error-message';

    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Laptop';
    }
});

async function initializeAddLaptopForm() {
    try {
        const [authResponse] = await Promise.all([fetch(storeApi('/auth/me')), loadStoreProfile()]);
        if (!authResponse.ok) return window.location.assign(storePath('/admin/login'));
        const authResult = await authResponse.json();
        if (authResult.admin?.mustChangePassword) return window.location.assign(storePath('/admin/change-password'));
        await window.loadLaptopOptions();
        await window.loadCustomSpecifications();
    } catch (error) {
        message.textContent = error.message;
        message.className = 'error-message';
        submitBtn.disabled = true;
    }
}

initializeAddLaptopForm();

// Clean up temporary preview URLs
window.addEventListener('beforeunload', () => {
    selectedImages.forEach(image => {
        URL.revokeObjectURL(image.previewUrl);
    });
});
