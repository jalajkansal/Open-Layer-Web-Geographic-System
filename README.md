🌐 Web Geographic Information System (WebGIS)This project is a dynamic, client-side Geographic Information System (GIS) application developed for a B.Tech. program, inspired by the work done at ISSA, DRDO. It is built entirely on HTML, CSS, and JavaScript using the OpenLayers library, providing powerful mapping, analysis, and visualization tools directly within the browser without requiring a backend server.
<br>
✨ Core Functionality
The application is structured around a header, a resizable control sidebar, and a full-page map viewer, offering the following features:
Map Visualization - Multiple Base Maps (OSM, Satellite, Terrain), and customizable GeoJSON Overlays for Indian States, Districts, and Roads.
Analysis Tools - Precise measurement for Line Distance, Polygon Area, and Circle Radius using spherical geometry calculations. Includes options to Clear All or Remove individual measurements.
Search & Navigation - State Search in the header allows users to zoom and pan the map instantly to a specific State or District boundary.
Interface & Info - Get Feature Info tool to click on map features and retrieve attribute data in a popup. Includes a live Date Display and a flexible Resizable Sidebar.
<br>
🛠️ Setup Guide
Since this is a client-side (no-server) project, setup is quick:
1. Project Files: Ensure all files (index.html, style.css, script.js) and your GeoJSON data files (india_states.geojson, etc.) are located in the same directory.
2. Data Check: Verify that the GEOJSON_PATHS in script.js are correctly pointing to your local data files.
3. Run: Open index.html directly in any modern web browser.
This structure allows you to showcase all advanced map features and interactive controls required by your project report efficiently.
