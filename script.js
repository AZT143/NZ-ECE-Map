// Initialize the map, centered on New Zealand
const map = L.map('map', {
    zoomControl: true,        // Enables zoom buttons
    dragging: true,           // Allows dragging with the mouse
    scrollWheelZoom: true     // Allows zooming with the scroll wheel
}).setView([-41.2865, 174.7762], 5);
map.zoomControl.setPosition('bottomleft');

// Add free CartoDB tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// Fetch and display GeoJSON data
fetch('data/ece_services.geojson')
    .then(response => response.json())
    .then(data => {
        // Use a Set to keep track of pinned (clicked) markers
        const pinnedLayers = new Set();

        const geojsonLayer = L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                const children = feature.properties.All_Children || 0;
                let color;
                if (children < 30) color = '#4C0035';
                else if (children < 45) color = '#880030';
                else if (children < 60) color = '#D6610A';
                else if (children < 75) color = '#EF9100';
                else color = '#FFC300';
                return L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: color,
                    color: 'transparent',
                    weight: 0,
                    opacity: 0,
                    fillOpacity: 1
                });
            },
            onEachFeature: function (feature, layer) {
                const properties = feature.properties;
                const fields = {
                    "ECE_Id": "ECE ID",
                    "Org_Name": "Centre Name",
                    "Telephone": "Telephone",
                    "Email": "Email",
                    "Add1_Line1": "Address",
                    "Add1_Suburb": "Suburb",
                    "Add1_City": "City",
                    "Add2_City": "Postal City",
                    "All_Children": "Number of Children"
                };
                let popupContent = "<h3>" + (properties.Org_Name || "Unknown Centre") + "</h3>";
                for (const [key, displayName] of Object.entries(fields)) {
                    if (properties[key] && properties[key] !== "null") {
                        popupContent += `<p><strong>${displayName}:</strong> ${properties[key]}</p>`;
                    }
                }
                layer.bindPopup(popupContent, { autoPan: false, autoClose: false, closeOnClick: false });

        
                // Track if this layer’s popup is pinned (opened via click)
                let openedViaClick = false;
        
                // Show popup on hover (only if not pinned)
                layer.on('mouseover', function () {
                    if (!openedViaClick) {
                        layer.openPopup();
                    }
                });
        
                // Hide popup on mouseout (only if not pinned)
                layer.on('mouseout', function () {
                    if (!openedViaClick) {
                        layer.closePopup();
                    }
                });
        
                // On click, pin the popup so it stays open
                layer.on('click', function () {
                    openedViaClick = true;
                    layer.openPopup();
                    pinnedLayers.add(layer);
                });
        
                // When the popup is closed (by user action), unpin it
                layer.on('popupclose', function () {
                    openedViaClick = false;
                    pinnedLayers.delete(layer);
                });
            }
        }).addTo(map);
        
        // Set up the search functionality
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        const organizations = data.features.map(feature => feature.properties.Org_Name);
        
        searchInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            const matches = organizations.filter(org => org.toLowerCase().includes(value));
            searchResults.innerHTML = '';
            if (matches.length > 0) {
                searchResults.classList.add('visible');
                matches.forEach(match => {
                    const div = document.createElement('div');
                    div.textContent = match;
                    div.classList.add('search-result-item');
                    
                    // On search result click, simulate a click on the matching marker
                    div.addEventListener('click', () => {
                        const feature = data.features.find(f => f.properties.Org_Name === match);
                        if (feature) {
                            const layers = geojsonLayer.getLayers();
                            const targetLayer = layers.find(layer => layer.feature.properties.Org_Name === match);
                            if (targetLayer) {
                                targetLayer.fire('click'); // triggers the pinned popup behavior
                            }
                        }
                        searchResults.innerHTML = '';
                        searchResults.classList.remove('visible');
                        searchInput.value = match;
                    });
                    
                    searchResults.appendChild(div);
                });
            } else {
                searchResults.classList.remove('visible');
            }
        });
        
        // Close all pinned popups when the map is clicked (outside markers)
        map.on('click', function () {
            pinnedLayers.forEach(layer => {
                layer.closePopup();
                // The popupclose event will remove it from pinnedLayers
            });
        });
        
        // Optional: When the search input is cleared, also close all pinned popups
        searchInput.addEventListener('change', (e) => {
            if (!e.target.value) {
                pinnedLayers.forEach(layer => {
                    layer.closePopup();
                });
                searchResults.classList.remove('visible');
            }
        });
    });
