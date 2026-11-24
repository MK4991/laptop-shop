const loadingMessage = document.getElementById('contactPageLoading');
const emptyMessage = document.getElementById('contactPageEmpty');
const pageLayout = document.getElementById('contactPageLayout');
const detailsCard = document.getElementById('contactDetailsCard');
const locationCard = document.getElementById('contactLocationCard');
const mapFrameWrap = document.getElementById('contactMapFrameWrap');
const mapFallback = document.getElementById('contactMapFallback');
const initialMapZoom = 17;
document.getElementById('currentYear').textContent = new Date().getFullYear();

function extractMapCoordinates(value) {
    if (!value) return null;
    const source = String(value).replace(/&amp;/g, '&');
    let match = source.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i);
    let latitude;
    let longitude;
    if (match) {
        latitude = Number(match[1]);
        longitude = Number(match[2]);
    } else {
        match = source.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/i);
        if (match) {
            longitude = Number(match[1]);
            latitude = Number(match[2]);
        } else {
            match = source.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|\/)/);
            if (match) {
                latitude = Number(match[1]);
                longitude = Number(match[2]);
            }
        }
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return `${latitude},${longitude}`;
}

function createZoomedMapEmbed(location) {
    const mapUrl = new URL('https://www.google.com/maps');
    mapUrl.searchParams.set('q', location);
    mapUrl.searchParams.set('z', String(initialMapZoom));
    mapUrl.searchParams.set('output', 'embed');
    return mapUrl.toString();
}

async function initializeContactPage() {
    try {
        const store = await loadStoreProfile();
        const hasContactDetails = Boolean(
            store.contact_email || store.contact_phone || store.contact_address ||
            store.maps_url || store.map_embed_url || (store.social_links || []).length
        );
        const hasContactCard = Boolean(store.contact_email || store.contact_phone || store.contact_address || (store.social_links || []).length);
        const hasLocation = Boolean(store.contact_address || store.maps_url || store.map_embed_url);

        pageLayout.classList.toggle('contact-page-layout--single', hasContactDetails && !(hasContactCard && hasLocation));
        document.getElementById('contactAddressItem').hidden = !store.contact_address;
        detailsCard.hidden = !hasContactCard;
        locationCard.hidden = !hasLocation;
        pageLayout.hidden = !hasContactDetails;
        loadingMessage.hidden = true;
        emptyMessage.hidden = hasContactDetails;

        if (store.map_embed_url || store.contact_address) {
            const pinCoordinates = extractMapCoordinates(store.map_embed_url) || extractMapCoordinates(store.maps_url);
            const mapEmbedUrl = pinCoordinates
                ? createZoomedMapEmbed(pinCoordinates)
                : (store.map_embed_url || createZoomedMapEmbed(store.contact_address));
            document.getElementById('contactMapFrame').src = mapEmbedUrl;
            mapFrameWrap.hidden = false;
            mapFallback.hidden = true;
        } else {
            mapFrameWrap.hidden = true;
            mapFallback.hidden = !store.maps_url;
        }
    } catch (error) {
        console.error('Contact page error:', error);
        loadingMessage.hidden = true;
        emptyMessage.textContent = 'Store contact information could not be loaded. Please try again later.';
        emptyMessage.hidden = false;
    }
}

initializeContactPage();
