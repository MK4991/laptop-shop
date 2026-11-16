
// ========================================
// LAPTOP CATALOGUE
// ========================================

// HTML elements
const laptopGrid = document.getElementById('laptopGrid');
const resultCount = document.getElementById('resultCount');

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

const brandFilter = document.getElementById('brandFilter');
const processorFilter = document.getElementById('processorFilter');
const generationFilter = document.getElementById('generationFilter');
const ramFilter = document.getElementById('ramFilter');
const storageFilter = document.getElementById('storageFilter');
const storageTypeFilter = document.getElementById('storageTypeFilter');
const minPrice = document.getElementById('minPrice');
const maxPrice = document.getElementById('maxPrice');
const conditionFilter = document.getElementById('conditionFilter');
const gpuFilter = document.getElementById('gpuFilter');
const screenSizeFilter = document.getElementById('screenSizeFilter');
const sortFilter = document.getElementById('sortFilter');
const clearFiltersButton = document.getElementById('clearFilters');


// Store all laptops for filter options
let allLaptops = [];


// ========================================
// LOAD LAPTOPS
// ========================================

async function loadAllLaptops() {
    try {
        const response = await fetch('/api/laptops');

        if (!response.ok) {
            throw new Error('Could not load laptops.');
        }

        const result = await response.json();

        allLaptops = result.data || [];

        populateBrandFilter();
        populateGenerationFilter();

        await loadFilteredLaptops();

    } catch (error) {
        console.error(error);

        laptopGrid.innerHTML = `
            <p class="error-message">
                Unable to load laptops. Please try again later.
            </p>
        `;

        resultCount.textContent = 'Something went wrong';
    }
}


// ========================================
// POPULATE BRAND FILTER
// ========================================

function populateBrandFilter() {
    const brands = [
        ...new Set(
            allLaptops
                .map(laptop => laptop.brand?.brand_name)
                .filter(Boolean)
        )
    ];

    brands.sort();

    brands.forEach(brand => {
        const option = document.createElement('option');

        option.value = brand;
        option.textContent = brand;

        brandFilter.appendChild(option);
    });
}


// ========================================
// POPULATE PROCESSOR GENERATION FILTER
// ========================================

function populateGenerationFilter() {
    const generations = [
        ...new Set(
            allLaptops
                .map(laptop => laptop.processor_generation)
                .filter(generation => generation !== null &&
                    generation !== undefined)
        )
    ];

    generations.sort((a, b) => a - b);

    generations.forEach(generation => {
        const option = document.createElement('option');

        option.value = generation;
        option.textContent = `Generation ${generation}`;

        generationFilter.appendChild(option);
    });
}


// ========================================
// GET FILTER VALUES
// ========================================

function getFilterParameters() {
    const params = new URLSearchParams();

    if (searchInput.value.trim()) {
        params.set('search', searchInput.value.trim());
    }

    if (brandFilter.value) {
        params.set('brand', brandFilter.value);
    }

    if (processorFilter.value) {
        params.set('processor_brand', processorFilter.value);
    }

    if (generationFilter.value) {
        params.set('processor_generation', generationFilter.value);
    }

    if (ramFilter.value) {
        params.set('ram', ramFilter.value);
    }

    if (storageFilter.value) {
        params.set('storage', storageFilter.value);
    }

    if (storageTypeFilter.value) {
        params.set('storage_type', storageTypeFilter.value);
    }

    if (minPrice.value) {
        params.set('min_price', minPrice.value);
    }

    if (maxPrice.value) {
        params.set('max_price', maxPrice.value);
    }

    if (conditionFilter.value) {
        params.set('condition', conditionFilter.value);
    }

    if (gpuFilter.value.trim()) {
        params.set('gpu', gpuFilter.value.trim());
    }

    if (screenSizeFilter.value) {
        params.set('screen_size', screenSizeFilter.value);
    }

    if (sortFilter.value) {
        params.set('sort', sortFilter.value);
    }

    return params;
}


// ========================================
// LOAD FILTERED LAPTOPS
// ========================================

async function loadFilteredLaptops() {
    try {
        laptopGrid.innerHTML = `
            <p class="loading-message">
                Loading laptops...
            </p>
        `;

        const params = getFilterParameters();

        const response = await fetch(
            `/api/laptops?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error('Could not retrieve laptops.');
        }

        const result = await response.json();

        const laptops = (result.data || []).filter(laptop =>
            laptop.availability === 'Available' &&
            Number(laptop.quantity) > 0
        );

        displayLaptops(laptops);

    } catch (error) {
        console.error(error);

        laptopGrid.innerHTML = `
            <p class="error-message">
                Something went wrong while loading laptops.
                Please refresh the page.
            </p>
        `;

        resultCount.textContent = 'Unable to load results';
    }
}


// ========================================
// DISPLAY LAPTOPS
// ========================================

function displayLaptops(laptops) {
    laptopGrid.innerHTML = '';

    resultCount.textContent =
        `${laptops.length} laptop${laptops.length !== 1 ? 's' : ''} found`;

    if (laptops.length === 0) {
        laptopGrid.innerHTML = `
            <p class="empty-message">
                No laptops match your search.
                Try changing or clearing your filters.
            </p>
        `;

        return;
    }

    laptops.forEach(laptop => {
        const card = createLaptopCard(laptop);

        laptopGrid.appendChild(card);
    });
}


// ========================================
// CREATE LAPTOP CARD
// ========================================

function createLaptopCard(laptop) {
    const card = document.createElement('article');

    card.className = 'product-card';

    const primaryImage = laptop.images?.find(
        image => image.is_primary
    ) || laptop.images?.[0];

    const imageContainer = document.createElement('div');
    imageContainer.className = 'product-image';

    if (primaryImage) {
        const image = document.createElement('img');

        image.src = primaryImage.image_url;
        image.alt = `${laptop.brand?.brand_name || ''} ${laptop.model}`;

        image.onerror = () => {
            image.remove();
            imageContainer.textContent = 'Image unavailable';
        };

        imageContainer.appendChild(image);
    } else {
        imageContainer.textContent = 'No image available';
    }

    const details = document.createElement('div');
    details.className = 'product-details';

    const brand = document.createElement('p');
    brand.className = 'product-brand';
    brand.textContent = laptop.brand?.brand_name || 'Unknown Brand';

    const name = document.createElement('h3');
    name.className = 'product-name';
    name.textContent = laptop.model;

    const specifications = document.createElement('div');
    specifications.className = 'product-specifications';

    const specs = [
        `${laptop.processor_model}`,
        `${laptop.ram_capacity} GB RAM`,
        `${laptop.storage_capacity} GB ${laptop.storage_type}`,
        `${laptop.screen_size}" Display`
    ];

    specs.forEach(spec => {
        const item = document.createElement('span');
        item.textContent = spec;
        specifications.appendChild(item);
    });

    const bottom = document.createElement('div');
    bottom.className = 'product-bottom';

    const priceContainer = document.createElement('div');

    const price = document.createElement('p');
    price.className = 'product-price';

    price.textContent = `ETB ${Number(laptop.price).toLocaleString()}`;

    const condition = document.createElement('span');
    condition.className = 'product-condition';
    condition.textContent = laptop.condition;

    priceContainer.appendChild(price);
    priceContainer.appendChild(condition);

    const detailsLink = document.createElement('a');
    detailsLink.className = 'product-button';
    detailsLink.href = `/laptops/${laptop.laptop_id}`;
    detailsLink.textContent = 'View Details';

    bottom.appendChild(priceContainer);
    bottom.appendChild(detailsLink);

    details.appendChild(brand);
    details.appendChild(name);
    details.appendChild(specifications);
    details.appendChild(bottom);

    card.appendChild(imageContainer);
    card.appendChild(details);

    return card;
}


// ========================================
// SEARCH WITH DEBOUNCING
// ========================================

let searchTimeout;

searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        loadFilteredLaptops();
    }, 400);
});

searchButton.addEventListener('click', () => {
    clearTimeout(searchTimeout);
    loadFilteredLaptops();
});


// ========================================
// FILTER EVENTS
// ========================================

const filterElements = [
    brandFilter,
    processorFilter,
    generationFilter,
    ramFilter,
    storageFilter,
    storageTypeFilter,
    minPrice,
    maxPrice,
    conditionFilter,
    screenSizeFilter,
    sortFilter
];

filterElements.forEach(filter => {
    filter.addEventListener('change', loadFilteredLaptops);
});


// Search graphics card as the customer types
let gpuTimeout;

gpuFilter.addEventListener('input', () => {
    clearTimeout(gpuTimeout);

    gpuTimeout = setTimeout(() => {
        loadFilteredLaptops();
    }, 400);
});


// ========================================
// CLEAR ALL FILTERS
// ========================================

clearFiltersButton.addEventListener('click', () => {
    searchInput.value = '';

    brandFilter.value = '';
    processorFilter.value = '';
    generationFilter.value = '';
    ramFilter.value = '';
    storageFilter.value = '';
    storageTypeFilter.value = '';

    minPrice.value = '';
    maxPrice.value = '';

    conditionFilter.value = '';
    gpuFilter.value = '';
    screenSizeFilter.value = '';

    sortFilter.value = 'newest';

    loadFilteredLaptops();
});


// ========================================
// FOOTER YEAR
// ========================================

const currentYear = document.getElementById('currentYear');

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}


// ========================================
// START THE PAGE
// ========================================

loadAllLaptops();
