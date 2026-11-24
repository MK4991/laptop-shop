
const featuredContainer =
    document.getElementById('featuredLaptops');
const featuredCarousel = document.getElementById('featuredCarousel');

function setupFeaturedCarousel() {
    const mobileView = window.matchMedia('(max-width: 850px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer;
    let resumeTimer;
    let transitionTimer;
    let currentIndex = 0;

    const cards = () => [...featuredContainer.querySelectorAll('.product-card')];
    const stop = () => {
        window.clearInterval(timer);
        timer = null;
        window.clearTimeout(transitionTimer);
        featuredContainer.classList.remove('is-auto-fading');
    };
    const goTo = (index) => {
        const items = cards();
        if (!items.length) return;
        currentIndex = (index + items.length) % items.length;
        const card = items[currentIndex];
        featuredContainer.scrollTo({ left: card.offsetLeft - items[0].offsetLeft, behavior: 'smooth' });
    };
    const start = () => {
        stop();
        if (!mobileView.matches || reducedMotion.matches || cards().length < 2) return;
        timer = window.setInterval(() => {
            featuredContainer.classList.add('is-auto-fading');
            transitionTimer = window.setTimeout(() => {
                goTo(currentIndex + 1);
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => featuredContainer.classList.remove('is-auto-fading'));
                });
            }, 240);
        }, 3500);
    };
    const pauseBriefly = () => {
        stop();
        window.clearTimeout(resumeTimer);
        resumeTimer = window.setTimeout(start, 5000);
    };
    featuredContainer.addEventListener('scroll', () => {
        const items = cards();
        if (!items.length) return;
        const distance = Math.max(0, featuredContainer.scrollLeft);
        const step = items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(featuredContainer).columnGap || '0');
        if (step > 0) currentIndex = Math.min(items.length - 1, Math.round(distance / step));
    }, { passive: true });
    featuredContainer.addEventListener('touchstart', pauseBriefly, { passive: true });
    featuredContainer.addEventListener('pointerdown', pauseBriefly);
    featuredCarousel.addEventListener('mouseenter', stop);
    featuredCarousel.addEventListener('mouseleave', start);
    mobileView.addEventListener('change', start);
    reducedMotion.addEventListener('change', start);
    start();
}

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
        `${laptop.storage_capacity} GB ${laptop.storage_type}`
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
    button.href = storePath(`/laptops/${encodeURIComponent(laptop.laptop_id)}`);
    button.textContent = 'View Details →';

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
        await loadStoreProfile();
        const response = await fetch(storeApi('/laptops?available_only=true&per_page=3&page=1'));
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || 'Failed to load laptops.'
            );
        }

        const availableLaptops = result.data || [];

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
        setupFeaturedCarousel();

    } catch (error) {
        console.error('Featured laptops error:', error);

        featuredContainer.textContent =
            'Unable to load laptops. Please try again later.';
    }
}

// Initialize homepage
loadFeaturedLaptops();
