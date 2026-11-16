
const laptopId = window.location.pathname.match(
    /^\/admin\/laptops\/(\d+)\/images\/?$/
)?.[1];

const imageList = document.getElementById('imageList');
const message = document.getElementById('message');
const imageInput = document.getElementById('images');
const uploadButton = document.getElementById('uploadButton');

const confirmationDialog =
    document.getElementById('confirmationDialog');

const confirmationTitle =
    document.getElementById('confirmationTitle');

const confirmationMessage =
    document.getElementById('confirmationMessage');

// Display a custom confirmation dialog
function showConfirmation(title, message) {
    confirmationTitle.textContent = title;
    confirmationMessage.textContent = message;

    return new Promise((resolve) => {
        confirmationDialog.addEventListener('close', () => {
            resolve(confirmationDialog.returnValue === 'confirm');
        }, { once: true });

        confirmationDialog.showModal();
    });
}

// Load laptop information
async function loadLaptopDetails() {
    try {
        const response = await fetch(`/api/laptops/${laptopId}`, {
            credentials: 'same-origin'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to load laptop details.');
        }

        const laptop = result.data;

        document.getElementById('laptopTitle').textContent =
            `${laptop.brand.brand_name} ${laptop.model}`;

    } catch (error) {
        console.error('Laptop details error:', error);
        document.getElementById('laptopTitle').textContent =
            'Laptop Images';
    }
}

// Display messages
function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? 'red' : 'green';
}

// Retrieve and display laptop images
async function loadImages() {
    imageList.textContent = 'Loading images...';

    try {
        const response = await fetch(`/api/laptops/${laptopId}/images`, {
            credentials: 'same-origin'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to load images.');
        }

        imageList.innerHTML = '';

        if (!result.data || result.data.length === 0) {
            imageList.textContent = 'No images available for this laptop.';
            return;
        }

        result.data.forEach(image => {
            const card = document.createElement('div');
            card.className = 'image-preview-item';

            const img = document.createElement('img');
            img.src = image.image_url;
            img.alt = 'Laptop image';

            const status = document.createElement('p');
            status.textContent = image.is_primary
                ? 'Primary Image'
                : 'Secondary Image';

            const primaryButton = document.createElement('button');
            primaryButton.textContent = 'Set as Primary';
            primaryButton.disabled = image.is_primary;

            primaryButton.addEventListener('click', () => {
                setPrimaryImage(image.image_id);
            });

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete Image';

            deleteButton.addEventListener('click', () => {
                deleteImage(image.image_id);
            });

            card.appendChild(img);
            card.appendChild(status);
            card.appendChild(primaryButton);
            card.appendChild(deleteButton);

            imageList.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        imageList.textContent = error.message;
    }
}

// Set primary image
async function setPrimaryImage(imageId) {
    try {
        const response = await fetch(
            `/api/laptops/${laptopId}/images/${imageId}/primary`,
            {
                method: 'PATCH',
                credentials: 'same-origin'
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to update primary image.');
        }

        showMessage(result.message);
        await loadImages();

    } catch (error) {
        showMessage(error.message, true);
    }
}

// Delete an image
async function deleteImage(imageId) {
    const confirmed = await showConfirmation(
        'Delete image?',
        'Are you sure you want to permanently delete this image? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `/api/laptops/${laptopId}/images/${imageId}`,
            {
                method: 'DELETE',
                credentials: 'same-origin'
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to delete image.');
        }

        showMessage(result.message);
        await loadImages();

    } catch (error) {
        showMessage(error.message, true);
    }
}

// Upload new images
uploadButton.addEventListener('click', async () => {
    const files = imageInput.files;

    if (!files.length) {
        showMessage('Please select at least one image.', true);
        return;
    }

    if (files.length > 5) {
        showMessage('You can upload a maximum of 5 images.', true);
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
            showMessage('Only JPEG, PNG, and WebP images are allowed.', true);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showMessage('Each image must be 5 MB or smaller.', true);
            return;
        }
    }

    const formData = new FormData();

    for (const file of files) {
        formData.append('images', file);
    }

    // First newly uploaded image becomes primary.
    formData.append('primaryIndex', '0');

    uploadButton.disabled = true;
    showMessage('Uploading images...');

    try {
        const response = await fetch(
            `/api/laptops/${laptopId}/images`,
            {
                method: 'POST',
                credentials: 'same-origin',
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Image upload failed.');
        }

        showMessage('Images uploaded successfully!');
        imageInput.value = '';

        await loadImages();

    } catch (error) {
        showMessage(error.message, true);
    } finally {
        uploadButton.disabled = false;
    }
});

// Load laptop information and images when the page opens
if (!laptopId) {
    showMessage('Invalid laptop URL.', true);
    uploadButton.disabled = true;
} else {
    loadLaptopDetails();
    loadImages();
}
