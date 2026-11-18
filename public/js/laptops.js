
// ========================================
// LAPTOP CATALOGUE
// ========================================

// HTML elements
const laptopGrid = document.getElementById('laptopGrid');
const resultCount = document.getElementById('resultCount');
const cataloguePagination = document.getElementById('cataloguePagination');
const cataloguePageInfo = document.getElementById('cataloguePageInfo');
const cataloguePrevious = document.getElementById('cataloguePrevious');
const catalogueNext = document.getElementById('catalogueNext');

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
const customSpecificationFilters = document.getElementById('customSpecificationFilters');
const sortFilter = document.getElementById('sortFilter');
const clearFiltersButton = document.getElementById('clearFilters');


let cataloguePage = 1;
let catalogueTotalPages = 1;
const cataloguePageSize = 25;
let customFilterDefinitions = [];


// ========================================
// LOAD LAPTOPS
// ========================================

async function loadAllLaptops() {
    try {
        const response = await fetch('/api/laptops/filters');

        if (!response.ok) {
            throw new Error('Could not load laptops.');
        }

        const result = await response.json();

        populateBrandFilter(result.data.brands || []);
        populateGenerationFilter(result.data.processorGenerations || []);
        const customResponse = await fetch('/api/custom-specifications');
        const customResult = await customResponse.json();
        if (!customResponse.ok || !customResult.success) {
            throw new Error(customResult.message || 'Could not load custom specification filters.');
        }
        customFilterDefinitions = customResult.data || [];
        renderCustomSpecificationFilters();

        await loadFilteredLaptops(1);

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

function renderCustomSpecificationFilters() {
    customSpecificationFilters.replaceChildren();
    customFilterDefinitions.forEach((definition) => {
        const group = document.createElement('div');
        group.className = 'filter-group custom-filter-group';
        const heading = document.createElement('h3');
        heading.textContent = definition.name;
        group.append(heading);

        if (definition.input_type === 'number') {
            const range = document.createElement('div');
            range.className = 'custom-number-range';
            [['min', 'Min'], ['max', 'Max']].forEach(([type, label]) => {
                const input = document.createElement('input');
                input.type = 'number';
                input.step = 'any';
                input.dataset.specificationId = definition.specification_id;
                input.dataset.rangeType = type;
                input.placeholder = label;
                input.setAttribute('aria-label', `${label} ${definition.name}`);
                input.addEventListener('change', () => loadFilteredLaptops(1));
                range.append(input);
            });
            group.append(range);
        } else if (definition.input_type === 'select' || definition.input_type === 'boolean') {
            const select = document.createElement('select');
            select.dataset.specificationId = definition.specification_id;
            select.add(new Option(`All ${definition.name}`, ''));
            const values = definition.input_type === 'boolean' ? ['Yes', 'No'] : definition.options;
            values.forEach((value) => select.add(new Option(value, value)));
            select.addEventListener('change', () => loadFilteredLaptops(1));
            group.append(select);
        } else {
            const input = document.createElement('input');
            input.type = 'search';
            input.dataset.specificationId = definition.specification_id;
            input.placeholder = `Search ${definition.name}`;
            input.setAttribute('aria-label', `Filter by ${definition.name}`);
            input.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => loadFilteredLaptops(1), 400);
            });
            group.append(input);
        }
        customSpecificationFilters.append(group);
    });
}


// ========================================
// POPULATE BRAND FILTER
// ========================================

function populateBrandFilter(brands) {
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

function populateGenerationFilter(generations) {
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

    customFilterDefinitions.forEach((definition) => {
        const id = definition.specification_id;
        if (definition.input_type === 'number') {
            const min = customSpecificationFilters.querySelector(`[data-specification-id="${id}"][data-range-type="min"]`);
            const max = customSpecificationFilters.querySelector(`[data-specification-id="${id}"][data-range-type="max"]`);
            if (min?.value) params.set(`spec_min_${id}`, min.value);
            if (max?.value) params.set(`spec_max_${id}`, max.value);
        } else {
            const control = customSpecificationFilters.querySelector(`[data-specification-id="${id}"]`);
            if (control?.value.trim()) params.set(`spec_${id}`, control.value.trim());
        }
    });

    if (sortFilter.value) {
        params.set('sort', sortFilter.value);
    }

    return params;
}


// ========================================
// LOAD FILTERED LAPTOPS
// ========================================

async function loadFilteredLaptops(page = 1) {
    try {
        laptopGrid.innerHTML = `
            <p class="loading-message">
                Loading laptops...
            </p>
        `;

        const params = getFilterParameters();
        params.set('page', String(page));
        params.set('per_page', String(cataloguePageSize));
        params.set('available_only', 'true');

        const response = await fetch(
            `/api/laptops?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error('Could not retrieve laptops.');
        }

        const result = await response.json();

        cataloguePage = result.pagination.page;
        catalogueTotalPages = result.pagination.totalPages;
        displayLaptops(result.data || [], result.pagination);

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

function displayLaptops(laptops, pagination) {
    laptopGrid.innerHTML = '';

    const first = pagination.total === 0
        ? 0
        : ((pagination.page - 1) * pagination.perPage) + 1;
    const last = first === 0 ? 0 : first + laptops.length - 1;
    resultCount.textContent = pagination.total === 0
        ? 'No laptops found'
        : `Showing ${first}–${last} of ${pagination.total} laptops`;

    cataloguePageInfo.textContent = `Page ${cataloguePage} of ${catalogueTotalPages}`;
    cataloguePrevious.disabled = cataloguePage <= 1;
    catalogueNext.disabled = cataloguePage >= catalogueTotalPages;
    cataloguePagination.hidden = pagination.totalPages <= 1;

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
        `${laptop.storage_capacity} GB ${laptop.storage_type}`
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
        loadFilteredLaptops(1);
    }, 400);
});

searchButton.addEventListener('click', () => {
    clearTimeout(searchTimeout);
    loadFilteredLaptops(1);
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
    sortFilter
];

filterElements.forEach(filter => {
    filter.addEventListener('change', () => loadFilteredLaptops(1));
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
    customSpecificationFilters.querySelectorAll('input, select').forEach((control) => {
        control.value = '';
    });

    sortFilter.value = 'newest';

    loadFilteredLaptops(1);
});

cataloguePrevious.addEventListener('click', () => {
    if (cataloguePage > 1) loadFilteredLaptops(cataloguePage - 1);
});

catalogueNext.addEventListener('click', () => {
    if (cataloguePage < catalogueTotalPages) loadFilteredLaptops(cataloguePage + 1);
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
