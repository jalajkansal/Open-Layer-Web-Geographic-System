// --- CONFIGURATION ---
// ***CRITICAL***: Replace these placeholder URLs with the path to your actual GeoJSON files.
const GEOJSON_PATHS = {
    states: 'india_states.geojson', 
    districts: 'india_districts.geojson',
    roads: 'india_roads.geojson'
};

// --- START: HEADER JS LOGIC ---

// 1. Display Current Date
function updateDate() {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const dateString = new Date().toLocaleDateString('en-US', options);
    document.getElementById('current-date').textContent = dateString;
}
updateDate(); 

// 2. Toggle Profile Menu
function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// Close profile menu when clicking outside
window.onclick = function(event) {
    if (!event.target.matches('.profile-btn') && !event.target.closest('.profile-btn')) {
        const menu = document.getElementById('profile-menu');
        if (menu && menu.style.display === 'block') {
            menu.style.display = 'none';
        }
    }
}

// --- END: HEADER JS LOGIC ---


// --- START: RESIZABLE SIDEBAR LOGIC ---

const sidebar = document.getElementById('sidebar');
const handle = document.getElementById('resize-handle');
let isResizing = false;

handle.addEventListener('mousedown', function(e) {
    isResizing = true;
    document.body.classList.add('resizing'); 
});

document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    const minWidth = 250; 
    const maxWidth = 500; 
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
        sidebar.style.width = newWidth + 'px';
    }
});

document.addEventListener('mouseup', function() {
    if (isResizing) {
        isResizing = false;
        document.body.classList.remove('resizing');
        map.updateSize(); 
    }
});

// --- END: RESIZABLE SIDEBAR LOGIC ---


// --- START: MAP/OPENLAYERS CORE LOGIC ---

// Helper function to create a Vector Layer from a GeoJSON path
const createGeoJsonLayer = (title, url, styleFunc, visible = true) => {
    return new ol.layer.Vector({
        title: title,
        visible: visible,
        source: new ol.source.Vector({
            url: url,
            format: new ol.format.GeoJSON()
        }),
        style: styleFunc
    });
};

// Custom Styles
const stateStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({ color: 'rgba(0, 123, 255, 1.0)', width: 2 }),
    fill: new ol.style.Fill({ color: 'rgba(0, 123, 255, 0.1)' })
});

const districtStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({ color: 'rgba(255, 193, 7, 0.8)', width: 1 }),
    fill: new ol.style.Fill({ color: 'rgba(255, 193, 7, 0.05)' })
});

const roadStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({ color: 'red', width: 2.5 })
});

// 1. Base Map Layer Definitions
const baseLayers = {
    'OSM': new ol.layer.Tile({ title: 'OSM', type: 'base', source: new ol.source.OSM(), visible: true }),
    'Satellite': new ol.layer.Tile({
        title: 'Satellite', type: 'base', visible: false,
        source: new ol.source.XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' })
    }),
    'Terrain': new ol.layer.Tile({
        title: 'Terrain', type: 'base', visible: false,
        source: new ol.source.XYZ({
            url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            attributions: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
        })
    })
};

// 2. Data Overlay Layers (using GeoJSON)
const stateLayer = createGeoJsonLayer('india_states', GEOJSON_PATHS.states, stateStyle);
const districtLayer = createGeoJsonLayer('india_districts', GEOJSON_PATHS.districts, districtStyle);
const roadsLayer = createGeoJsonLayer('india_roads', GEOJSON_PATHS.roads, roadStyle);
const overlayLayers = [stateLayer, districtLayer, roadsLayer];

// Map Initialization
const map = new ol.Map({
    target: 'map',
    layers: [baseLayers['OSM'], baseLayers['Satellite'], baseLayers['Terrain'], ...overlayLayers],
    view: new ol.View({
        center: ol.proj.fromLonLat([78.9629, 23.5937]), 
        zoom: 4 
    })
});


// --- UI EVENT LISTENERS ---

// Base Map Switcher
document.querySelectorAll('#base-map-views input[name="baseMap"]').forEach(control => {
    control.addEventListener('change', function() {
        Object.values(baseLayers).forEach(layer => layer.setVisible(false));
        baseLayers[this.value].setVisible(true);
    });
});

// Overlay Visibility Toggles
document.getElementById('toggle_states').addEventListener('change', function() { stateLayer.setVisible(this.checked); });
document.getElementById('toggle_districts').addEventListener('change', function() { districtLayer.setVisible(this.checked); });
document.getElementById('toggle_roads').addEventListener('change', function() { roadsLayer.setVisible(this.checked); });


// --- MEASUREMENT LOGIC (Length, Area, Circle Radius) ---

let draw;
const source = new ol.source.Vector();
const vectorLayer = new ol.layer.Vector({ source: source });
map.addLayer(vectorLayer);

// Helper functions for measurement calculations
const formatLength = (line) => {
    const length = ol.sphere.getLength(line); 
    return length > 1000 ? (Math.round((length / 1000) * 100) / 100) + ' km' : (Math.round(length * 100) / 100) + ' m';
};

const formatArea = (polygon) => {
    const area = ol.sphere.getArea(polygon);
    return area > 1000000 ? (Math.round((area / 1000000) * 100) / 100) + ' km²' : (Math.round(area * 100) / 100) + ' m²';
};

const typeSelect = document.getElementById('measurement-type');

// Function to remove all active interactions (draw, info, select)
function removeActiveInteractions() {
    map.getInteractions().getArray().filter(
        (interaction) => interaction.get('name') === 'draw_tool' || 
                         interaction.get('name') === 'info_click' || 
                         interaction.get('name') === 'delete_tool'
    ).forEach(interaction => map.removeInteraction(interaction));
}

function addInteraction() {
    const currentMeasureType = typeSelect.value;
    removeActiveInteractions(); // Clear previous active tool

    if (currentMeasureType === 'Clear') {
        source.clear();
        map.getOverlays().getArray().forEach(o => {
            if (o.getElement().className.includes('ol-tooltip')) map.removeOverlay(o);
        });
        typeSelect.value = 'none';
        return;
    }
    
    if (currentMeasureType === 'Remove') { // New delete feature option
        addDeleteInteraction();
        return;
    }

    if (currentMeasureType !== 'none') {
        const geometryType = currentMeasureType === 'Length' ? 'LineString' : (currentMeasureType === 'Area' ? 'Polygon' : 'Circle');
        
        draw = new ol.interaction.Draw({
            source: source,
            type: geometryType
        });
        draw.set('name', 'draw_tool'); // Set name for easy removal
        
        map.addInteraction(draw);

        draw.on('drawend', function (evt) {
            const geom = evt.feature.getGeometry();
            let output;
            
            if (geom instanceof ol.geom.Polygon) {
                output = formatArea(geom);
            } else if (geom instanceof ol.geom.LineString) {
                output = formatLength(geom);
            } else if (geom instanceof ol.geom.Circle) {
                const center = geom.getCenter();
                const coordinate = geom.getExtent();
                const radiusLine = new ol.geom.LineString([center, [coordinate[0], coordinate[1]]]); 
                output = 'Radius: ' + formatLength(radiusLine);
            }

            const tooltipElement = document.createElement('div');
            tooltipElement.className = 'ol-tooltip ol-tooltip-static';
            tooltipElement.innerHTML = output;
            
            const tooltip = new ol.Overlay({ element: tooltipElement, positioning: 'bottom-center' });
            
            let position = geom.getLastCoordinate() || geom.getCenter();
            tooltip.setPosition(position);
            map.addOverlay(tooltip);
            
            // Link the tooltip to the feature for joint removal
            evt.feature.set('tooltip', tooltip); 

            map.removeInteraction(draw);
            addInteraction(); 
        });
    }
}

// *** NEW: Delete Interaction Functionality ***
function addDeleteInteraction() {
    // 1. Create a Select interaction limited to the vector layer
    const select = new ol.interaction.Select({
        layers: [vectorLayer],
        hitTolerance: 5
    });
    select.set('name', 'delete_tool'); 
    map.addInteraction(select);

    // 2. Add a listener for when a feature is selected
    select.getFeatures().on(['add'], function(e) {
        if (e.element) {
            const feature = e.element;
            
            // Remove the associated tooltip (label)
            const tooltip = feature.get('tooltip');
            if (tooltip) {
                map.removeOverlay(tooltip);
            }

            // Remove the feature itself from the source
            source.removeFeature(feature);

            // Clear the selection after removal
            select.getFeatures().clear();
        }
    });

    alert('Delete tool activated: Click on a measurement to remove it.');
}

// Add 'Remove' option to the dropdown list programmatically if it doesn't exist
document.addEventListener('DOMContentLoaded', () => {
    const removeOption = document.createElement('option');
    removeOption.value = 'Remove';
    removeOption.textContent = 'Remove Line/Square/Circle';
    // Check to prevent duplication on multiple script loads
    if (!typeSelect.querySelector('option[value="Remove"]')) {
        typeSelect.appendChild(removeOption);
    }
});


typeSelect.onchange = addInteraction;
addInteraction();


// --- GET FEATURE INFO LOGIC ---

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');
const infoSelect = document.getElementById('get-info-option');
const popup = new ol.Overlay({ element: container });
map.addOverlay(popup);

closer.onclick = function() { popup.setPosition(undefined); closer.blur(); return false; };

const addInfoInteraction = () => {
    removeActiveInteractions(); // Clear all tools first
    
    const infoType = infoSelect.value;

    if (infoType !== 'none') {
        const infoInteraction = new ol.interaction.Click({
            name: 'info_click',
            handleEvent: function(evt) {
                const coordinate = evt.coordinate;
                const lonLat = ol.proj.toLonLat(coordinate);
                
                if (infoType === 'Coordinates') {
                    content.innerHTML = `<p class='panel-header'>📍 Coordinates:</p><p><strong>Lon:</strong> ${lonLat[0].toFixed(4)}</p><p><strong>Lat:</strong> ${lonLat[1].toFixed(4)}</p>`;
                    popup.setPosition(coordinate);
                } else if (infoType === 'State' || infoType === 'District') {
                    const layerToQuery = infoType === 'State' ? stateLayer : districtLayer;
                    
                    const features = map.getFeaturesAtPixel(evt.pixel, {
                         layerFilter: (layer) => (layer === layerToQuery)
                    });

                    if (features && features.length > 0) {
                        const clickedFeature = features[0];
                        const properties = clickedFeature.getProperties();
                        
                        let infoHtml = `<p class='panel-header'>${infoType} Info:</p>`;
                        
                        for (const key in properties) {
                            if (key !== 'geometry' && key !== layerToQuery.getSource().getFormat().geometryName_ && properties[key] !== null) {
                                infoHtml += `<p><strong>${key.replace(/_/g, ' ').toUpperCase()}:</strong> ${properties[key]}</p>`;
                            }
                        }
                        
                        if (Object.keys(properties).length <= 1) {
                            infoHtml += `<p><strong>Note:</strong> Data is simulated or GeoJSON properties are missing.</p>`;
                        }

                        content.innerHTML = infoHtml;
                        popup.setPosition(coordinate);
                    } else {
                        content.innerHTML = `<p>No ${infoType} feature found here. (Check layer visibility)</p>`;
                        popup.setPosition(coordinate);
                    }
                }
                return true;
            }
        });
        map.addInteraction(infoInteraction);
    }
};

infoSelect.onchange = addInfoInteraction;
// No need to call addInfoInteraction() on load; addInteraction() is called and sets default
// --- END: GET FEATURE INFO LOGIC ---


// --- STATE SEARCH AND ZOOM FUNCTIONALITY ---

document.getElementById('state-search-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const query = document.getElementById('state-search-input').value.trim().toLowerCase();

    if (query) {
        
        const layersToSearch = [stateLayer, districtLayer];
        
        let normalizedQuery = query;
        if (query.includes('delhi') || query.includes('nct') || query.includes('new delhi')) {
            normalizedQuery = 'delhi'; 
        }

        let foundFeature = null;
        
        for (const layer of layersToSearch) {
            const source = layer.getSource();
            
            if (source.getState() !== 'ready') {
                console.warn(`${layer.get('title')} data is still loading or failed.`);
                continue;
            }

            foundFeature = source.getFeatures().find(feature => {
                const props = feature.getProperties();
                
                // Concatenate all potential name properties into one string for robust checking
                const nameString = (
                    props.name || ''
                ).toLowerCase() + ' ' + (
                    props.NAME || ''
                ).toLowerCase() + ' ' + (
                    props.ADM1_EN || ''
                ).toLowerCase() + ' ' + (
                    props.ST_NM || ''
                ).toLowerCase() + ' ' + (
                    props.STATE_NAME || ''
                ).toLowerCase();
                
                // Use .includes() for flexible matching against the concatenated name string
                return nameString.includes(normalizedQuery);
            });
            
            if (foundFeature) {
                break; // Stop searching once feature is found
            }
        }
        
        if (foundFeature) {
            const extent = foundFeature.getGeometry().getExtent();

            map.getView().fit(extent, {
                duration: 1500, 
                padding: [50, 50, 50, 50] 
            });

            const featureName = (foundFeature.getProperties().name || foundFeature.getProperties().NAME || query).toUpperCase();
            alert(`Zooming to: ${featureName}`);

        } else {
            alert(`State or District "${query}" not found in the loaded data. Check your GeoJSON files.`);
        }
    }
});