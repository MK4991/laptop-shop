
// ========================================
// LAPTOP DETAILS PAGE
// ========================================

// HTML elements
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const laptopDetails = document.getElementById('laptopDetails');

const mainLaptopImage = document.getElementById('mainLaptopImage');
const thumbnailGallery = document.getElementById('thumbnailGallery');

const laptopBrand = document.getElementById('laptopBrand');
const laptopName = document.getElementById('laptopName');
const laptopPrice = document.getElementById('laptopPrice');

const availabilityStatus = document.getElementById('availabilityStatus');
const laptopCondition = document.getElementById('laptopCondition');
const quantityText = document.getElementById('quantityText');

// Specification elements
const processorBrand = document.getElementById('processorBrand');
const processorModel = document.getElementById('processorModel');
const processorGeneration = document.getElementById('processorGeneration');
const ramCapacity = document.getElementById('ramCapacity');
const storageCapacity = document.getElementById('storageCapacity');
const storageType = document.getElementById('storageType');

// Get laptop ID from the URL
const laptopId = window.location.pathname.split('/').filter(Boolean).pop();


// ========================================
// LOAD LAPTOP DETAILS
// ========================================

async function loadLaptopDetails() {
    try {
        const response = await fetch(`/api/laptops/${encodeURIComponent(laptopId)}`);

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Laptop not found.');
        }

        const laptop = result.data;

        displayLaptopDetails(laptop);

        loadingMessage.hidden = true;
        laptopDetails.hidden = false;

    } catch (error) {
        console.error('Error loading laptop:', error);

        loadingMessage.hidden = true;
        errorMessage.hidden = false;
        errorMessage.textContent =
            error.message || 'Unable to load laptop details. Please try again.';
    }
}


// ========================================
// DISPLAY LAPTOP INFORMATION
// ========================================


function displayLaptopDetails(laptop) {

    // Basic information
    laptopBrand.textContent = laptop.brand?.brand_name || 'Unknown Brand';
    laptopName.textContent = laptop.model || 'Unknown Model';

    laptopPrice.textContent =
        `ETB ${Number(laptop.price).toLocaleString()}`;

    laptopCondition.textContent = laptop.condition || 'Not specified';

    // Telegram contact button
    const telegramButton = document.createElement('a');

    telegramButton.href = 'https://t.me/asdfghjkl918273';
    telegramButton.target = '_blank';
    telegramButton.rel = 'noopener noreferrer';
    telegramButton.className = 'telegram-button';
    telegramButton.textContent = '✈ Contact Shop on Telegram';

    laptopPrice.insertAdjacentElement('afterend', telegramButton);

    // Availability
    const quantity = Number(laptop.quantity);

    let status = 'Available';
    let statusClass = 'available';

    if (laptop.availability === 'Unavailable') {
        status = 'Unavailable';
        statusClass = 'unavailable';
    } else if (quantity <= 0) {
        status = 'Sold Out';
        statusClass = 'unavailable';
    }

    availabilityStatus.textContent = status;
    availabilityStatus.classList.remove('available', 'unavailable');
    availabilityStatus.classList.add(statusClass);

    if (status === 'Available') {
        quantityText.textContent = `${quantity} unit(s) available`;
    } else if (status === 'Sold Out') {
        quantityText.textContent = 'Currently out of stock';
    } else {
        quantityText.textContent = 'Currently unavailable';
    }

    // Laptop specifications
    processorBrand.textContent = laptop.processor_brand || 'Not specified';
    processorModel.textContent = laptop.processor_model || 'Not specified';

    processorGeneration.textContent =
        laptop.processor_generation
            ? `Generation ${laptop.processor_generation}`
            : 'Not specified';

    ramCapacity.textContent = `${laptop.ram_capacity} GB`;
    storageCapacity.textContent = `${laptop.storage_capacity} GB`;
    storageType.textContent = laptop.storage_type || 'Not specified';

    const customSpecificationsSection = document.getElementById('customSpecificationsSection');
    const customSpecificationsList = document.getElementById('customSpecificationsList');
    const customSpecifications = Array.isArray(laptop.specifications)
        ? laptop.specifications.filter((item) => item?.name && item?.value)
        : [];
    customSpecificationsList.replaceChildren();
    customSpecifications.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'specification-row';
        const label = document.createElement('span');
        label.textContent = item.name;
        const value = document.createElement('strong');
        value.textContent = item.value;
        row.append(label, value);
        customSpecificationsList.append(row);
    });
    customSpecificationsSection.hidden = customSpecifications.length === 0;

    // Display laptop images
    displayLaptopImages(laptop.images || []);
}



// ========================================
// DISPLAY LAPTOP IMAGES
// ========================================

function displayLaptopImages(images) {

    thumbnailGallery.innerHTML = '';

    if (images.length === 0) {
        mainLaptopImage.hidden = true;
        mainLaptopImage.parentElement.textContent = 'No image available';
        return;
    }

    // Select primary image, or first image if none is primary
    const primaryImage =
        images.find(image => image.is_primary) || images[0];

    setMainImage(primaryImage);

    // Create thumbnails
    images.forEach(image => {

        const thumbnailButton = document.createElement('button');
        thumbnailButton.type = 'button';
        thumbnailButton.className = 'thumbnail';

        if (image.image_id === primaryImage.image_id) {
            thumbnailButton.classList.add('active');
        }

        thumbnailButton.setAttribute('aria-label', 'View laptop image');

        const thumbnailImage = document.createElement('img');
        thumbnailImage.src = image.image_url;
        thumbnailImage.alt = 'Laptop thumbnail';

        thumbnailButton.appendChild(thumbnailImage);

        thumbnailButton.addEventListener('click', () => {

            setMainImage(image);

            document.querySelectorAll('.thumbnail').forEach(button => {
                button.classList.remove('active');
            });

            thumbnailButton.classList.add('active');
        });

        thumbnailGallery.appendChild(thumbnailButton);
    });
}


// ========================================
// CHANGE MAIN IMAGE
// ========================================

function setMainImage(image) {

    mainLaptopImage.hidden = false;
    mainLaptopImage.src = image.image_url;
    mainLaptopImage.alt = `${laptopBrand.textContent} ${laptopName.textContent}`;

    mainLaptopImage.onerror = () => {
        mainLaptopImage.hidden = true;
        mainLaptopImage.parentElement.textContent = 'Image unavailable';
    };
}


// ========================================
// FOOTER YEAR
// ========================================

const currentYear = document.getElementById('currentYear');

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}


// ========================================
// START PAGE
// ========================================

loadLaptopDetails();
