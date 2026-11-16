
const featuredContainer =
    document.getElementById('featuredLaptops');

// Format prices in Ethiopian Birr
function formatPrice(price) {
    return Number(price).toLocaleString('en-US') + ' ETB';
}

// Create a laptop card
function createLaptopCard(laptop) {
    const card = document.createElement('article');
    card.className = 'product-card';

    // Image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'product-image';

    const primaryImage = laptop.images?.find(
        image => image.is_primary
    );

    const image = document.createElement('img');

    if (primaryImage) {
        image.src = primaryImage.image_url;
        image.alt = `${laptop.brand.brand_name} ${laptop.model}`;

        image.onerror = () => {
            imageContainer.innerHTML = '';
            const fallback = document.createElement('span');
            fallback.className = 'image-fallback';
            fallback.textContent = 'Laptop image unavailable';
            imageContainer.appendChild(fallback);
        };

        imageContainer.appendChild(image);
    } else {
        const fallback = document.createElement('span');
        fallback.className = 'image-fallback';
        fallback.textContent = 'No image available';
        imageContainer.appendChild(fallback);
    }

    // Product information
    const details = document.createElement('div');
    details.className = 'product-details';

    const brand = document.createElement('span');
    brand.className = 'product-brand';
    brand.textContent = laptop.brand.brand_name;

    const model = document.createElement('h3');
    model.className = 'product-name';
    model.textContent = laptop.model;

    const specifications = document.createElement('div');
    specifications.className = 'product-specifications';

    const specs = [
        `${laptop.processor_brand} ${laptop.processor_model}`,
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

    const price = document.createElement('strong');
    price.className = 'product-price';
    price.textContent = formatPrice(laptop.price);

    const condition = document.createElement('span');
    condition.className = 'product-condition';
    condition.textContent = laptop.condition;

    bottom.appendChild(price);
    bottom.appendChild(condition);

    const button = document.createElement('a');
    button.className = 'product-button';
    button.href = '/laptops';
    button.textContent = 'Browse Laptops →';

    details.append(
        brand,
        model,
        specifications,
        bottom,
        button
    );

    card.append(imageContainer, details);

    return card;
}

// Load featured laptops
async function loadFeaturedLaptops() {
    featuredContainer.textContent = 'Loading laptops...';

    try {
        const response = await fetch('/api/laptops');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Failed to load laptops.'
            );
        }

        const availableLaptops = result.data
            .filter(laptop =>
                laptop.availability === 'Available' &&
                Number(laptop.quantity) > 0
            )
            .slice(0, 3);

        featuredContainer.innerHTML = '';

        if (availableLaptops.length === 0) {
            featuredContainer.textContent =
                'No available laptops at the moment. Please check again later.';
            return;
        }

        availableLaptops.forEach(laptop => {
            const card = createLaptopCard(laptop);
            featuredContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Featured laptops error:', error);

        featuredContainer.textContent =
            'Unable to load laptops. Please try again later.';
    }
}

// Initialize homepage
loadFeaturedLaptops();
