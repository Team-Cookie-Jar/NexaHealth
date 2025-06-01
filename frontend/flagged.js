// flagged.js - Complete optimized JavaScript for flagged.html

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('hamburger-active');
            mobileMenu.classList.toggle('hidden');
        });

        // Close mobile menu when clicking a link
        document.querySelectorAll('#mobile-menu a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('hamburger-active');
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Initialize Main Map (Flagged Pharmacies) - Lazy loaded
    let mainMap = null;
    let pharmacyIcon = null;

    function initializeMainMap() {
        if (!mainMap) {
            mainMap = L.map('pharmacy-map', {
                preferCanvas: true,
                fadeAnimation: false,
                zoomControl: false
            }).setView([9.0820, 8.6753], 6);

            L.control.zoom({
                position: 'topright'
            }).addTo(mainMap);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                reuseTiles: true,
                updateWhenIdle: true
            }).addTo(mainMap);

            pharmacyIcon = L.icon({
                iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });
        }
        return mainMap;
    }

    // Current page and search state
    let currentPage = 1;
    let currentSearchParams = {};
    let currentView = 'flagged';

    // Nearby Pharmacies Functionality - Optimized
    const getLocationBtn = document.getElementById('get-location-btn');
    const locationPermission = document.getElementById('location-permission');
    const locationError = document.getElementById('location-error');
    const loadingSpinner = document.getElementById('loading-spinner');
    const nearbyResults = document.getElementById('nearby-results');
    const mapContainer = document.getElementById('map-container');
    const nearbyMapElement = document.getElementById('nearby-map');
    const showMapBtn = document.getElementById('show-map-btn');

    let nearbyMap = null;
    let userLocation = null;
    let nearbyPlaces = [];
    let isNearbyMapInitialized = false;

    // Pre-load map tiles in the background
    function preloadMapTiles() {
        if (!isNearbyMapInitialized) {
            nearbyMap = L.map('nearby-map', {
                preferCanvas: true,
                fadeAnimation: false,
                zoomControl: false
            }).setView([9.0820, 8.6753], 6);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                reuseTiles: true,
                updateWhenIdle: true
            }).addTo(nearbyMap);

            isNearbyMapInitialized = true;
            mapContainer.classList.add('hidden');
        }
    }

    // Initialize map tiles when page loads
    setTimeout(preloadMapTiles, 1000);

    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getNearbyPharmacies);
    }

    if (showMapBtn) {
        showMapBtn.addEventListener('click', toggleMap);
    }

    // Tab switching functionality
    document.getElementById('flagged-tab')?.addEventListener('click', () => {
        currentView = 'flagged';
        document.getElementById('flagged-tab').classList.add('text-primary', 'border-primary');
        document.getElementById('flagged-tab').classList.remove('text-gray-500');
        document.getElementById('all-reports-tab').classList.add('text-gray-500');
        document.getElementById('all-reports-tab').classList.remove('text-primary', 'border-primary');
        fetchFlaggedPharmacies(1);
    });

    document.getElementById('all-reports-tab')?.addEventListener('click', () => {
        currentView = 'all';
        document.getElementById('all-reports-tab').classList.add('text-primary', 'border-primary');
        document.getElementById('all-reports-tab').classList.remove('text-gray-500');
        document.getElementById('flagged-tab').classList.add('text-gray-500');
        document.getElementById('flagged-tab').classList.remove('text-primary', 'border-primary');
        fetchFlaggedPharmacies(1);
    });

    // Image viewer modal
    function showImageModal(imageUrl) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="relative max-w-4xl w-full">
                <button class="absolute -top-12 right-0 text-white text-3xl hover:text-gray-300">&times;</button>
                <img src="${imageUrl}" alt="Report evidence" class="max-h-screen w-full object-contain">
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('button').addEventListener('click', () => {
            modal.remove();
        });
    }

    // Main function to fetch and display data
    function fetchFlaggedPharmacies(page = 1) {
        currentPage = page;
        const pharmacyResults = document.getElementById('pharmacy-results');
        if (!pharmacyResults) return;

        // Get search parameters from form
        currentSearchParams = {
            pharmacy: document.getElementById('pharmacy-search').value,
            state: document.getElementById('state-filter').value,
            lga: document.getElementById('lga-filter').value,
            drug: document.getElementById('drug-filter').value,
            sort_by: document.getElementById('sort-by').value,
            sort_order: document.getElementById('sort-order').value,
            limit: document.getElementById('per-page').value
        };

        // Show loading state
        const cols = currentView === 'flagged' ? 5 : 6;
        pharmacyResults.innerHTML = `
            <tr class="animate-pulse">
                <td colspan="${cols}" class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                </td>
            </tr>
            <tr class="animate-pulse">
                <td colspan="${cols}" class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                </td>
            </tr>
        `;

        // Build query parameters
        const params = new URLSearchParams();
        if (currentSearchParams.pharmacy) params.append('pharmacy', currentSearchParams.pharmacy);
        if (currentSearchParams.state) params.append('state', currentSearchParams.state);
        if (currentSearchParams.lga) params.append('lga', currentSearchParams.lga);
        if (currentSearchParams.drug) params.append('drug', currentSearchParams.drug);
        params.append('sort_by', currentSearchParams.sort_by);
        params.append('sort_order', currentSearchParams.sort_order);
        params.append('page', currentPage);
        params.append('limit', currentSearchParams.limit);

        // Fetch data from API with search parameters
        fetch(`https://lyre-4m8l.onrender.com/get-flagged?${params.toString()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Update the table with real data
                pharmacyResults.innerHTML = '';

                if (currentView === 'flagged') {
                    if (!mainMap) {
                        initializeMainMap();
                    }

                    // Clear existing markers from map more efficiently
                    if (mainMap && mainMap.eachLayer) {
                        mainMap.eachLayer(layer => {
                            if (layer instanceof L.Marker) {
                                mainMap.removeLayer(layer);
                            }
                        });
                    }

                    // Flagged pharmacies view
                    if (data.flagged_pharmacies && data.flagged_pharmacies.length > 0) {
                        const markerClusterGroup = L.markerClusterGroup({
                            spiderfyOnMaxZoom: true,
                            showCoverageOnHover: false,
                            zoomToBoundsOnClick: true,
                            chunkedLoading: true,
                            chunkInterval: 100
                        });

                        data.flagged_pharmacies.forEach(pharmacy => {
                            let drugsList = '';
                            if (pharmacy.drugs && pharmacy.drugs.length > 0) {
                                pharmacy.drugs.forEach(drug => {
                                    drugsList += `<span class="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">${drug}</span>`;
                                });
                            }

                            const row = document.createElement('tr');
                            row.className = 'hover:bg-gray-50';
                            row.innerHTML = `
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="font-medium">${pharmacy.pharmacy}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div>${pharmacy.street_address || 'Address not available'}, ${pharmacy.lga || 'N/A'}</div>
                                    <div class="text-sm text-gray-500">${pharmacy.state || 'N/A'}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">${pharmacy.report_count} reports</span>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-wrap">${drugsList || 'No drugs listed'}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <button class="text-primary hover:text-secondary font-medium view-pharmacy-details" data-pharmacy="${encodeURIComponent(pharmacy.pharmacy)}">Details</button>
                                </td>
                            `;
                            pharmacyResults.appendChild(row);

                            if (pharmacy.lat && pharmacy.lng) {
                                const marker = L.marker([pharmacy.lat, pharmacy.lng], {icon: pharmacyIcon});

                                let drugsList = '';
                                if (pharmacy.drugs && pharmacy.drugs.length > 0) {
                                    pharmacy.drugs.forEach(drug => {
                                        drugsList += `<span class="badge bg-red-100 text-red-800">${drug}</span>`;
                                    });
                                }

                                marker.bindPopup(`
                                    <h3>${pharmacy.pharmacy}</h3>
                                    <p><strong>Location:</strong> ${pharmacy.street_address || 'N/A'}, ${pharmacy.lga || 'N/A'}, ${pharmacy.state || 'N/A'}</p>
                                    <p><strong>Reports:</strong> ${pharmacy.report_count}</p>
                                    <div class="mt-2">
                                        <p class="font-medium">Flagged Drugs:</p>
                                        <div class="mt-1">${drugsList || 'None'}</div>
                                    </div>
                                    <div class="mt-3 text-center">
                                        <button class="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-secondary transition view-pharmacy-details" data-pharmacy="${encodeURIComponent(pharmacy.pharmacy)}">
                                            View Details
                                        </button>
                                    </div>
                                `);

                                markerClusterGroup.addLayer(marker);
                            }
                        });

                        if (mainMap) {
                            mainMap.addLayer(markerClusterGroup);
                            if (data.flagged_pharmacies.some(p => p.lat && p.lng)) {
                                const markerBounds = markerClusterGroup.getBounds();
                                if (markerBounds.isValid()) {
                                    mainMap.fitBounds(markerBounds, {padding: [50, 50]});
                                }
                            }
                        }
                    } else {
                        pharmacyResults.innerHTML = `
                            <tr>
                                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                                    No flagged pharmacies found matching your search criteria
                                </td>
                            </tr>
                        `;
                    }
                } else {
                    // All reports view
                    if (data.all_reports && data.all_reports.length > 0) {
                        data.all_reports.forEach(report => {
                            const row = document.createElement('tr');
                            row.className = 'hover:bg-gray-50';
                            row.innerHTML = `
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="font-medium">${report.pharmacy_name || 'N/A'}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="font-medium">${report.drug_name || 'N/A'}</div>
                                    ${report.nafdac_reg_no ? `<div class="text-sm text-gray-500">NAFDAC: ${report.nafdac_reg_no}</div>` : ''}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div>${report.street_address || 'Address not available'}, ${report.lga || 'N/A'}</div>
                                    <div class="text-sm text-gray-500">${report.state || 'N/A'}</div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="max-w-xs truncate">${report.description || 'No description'}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-500">${new Date(report.timestamp).toLocaleString()}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    ${report.image_url ? `<button class="text-primary hover:text-secondary font-medium view-report-image" data-url="${report.image_url}">View Image</button>` : 'No image'}
                                </td>
                            `;
                            pharmacyResults.appendChild(row);
                        });

                        document.querySelectorAll('.view-report-image').forEach(button => {
                            button.addEventListener('click', function() {
                                const imageUrl = this.getAttribute('data-url');
                                showImageModal(imageUrl);
                            });
                        });
                    } else {
                        pharmacyResults.innerHTML = `
                            <tr>
                                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                                    No reports found matching your search criteria
                                </td>
                            </tr>
                        `;
                    }
                }

                // Update summary stats
                if (data.summary) {
                    document.getElementById('total-pharmacies').textContent = data.summary.total_flagged_pharmacies || '0';
                    document.getElementById('total-reports').textContent = data.summary.total_reports || '0';

                    if (data.summary.top_drugs && data.summary.top_drugs.length > 0) {
                        document.getElementById('top-drug').textContent = data.summary.top_drugs[0].drug_name || 'None';
                    }

                    const totalFiltered = currentView === 'flagged' ? (data.total_filtered || 0) : (data.all_reports?.length || 0);
                    const limit = parseInt(currentSearchParams.limit) || 10;
                    const start = (currentPage - 1) * limit + 1;
                    const end = Math.min(start + limit - 1, totalFiltered);

                    document.getElementById('pagination-info').innerHTML = `
                        Showing <span class="font-medium">${start}</span> to <span class="font-medium">${end}</span> of <span class="font-medium">${totalFiltered}</span> results
                    `;

                    updatePaginationButtons(totalFiltered, currentPage, limit);
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                pharmacyResults.innerHTML = `
                    <tr>
                        <td colspan="${currentView === 'flagged' ? 5 : 6}" class="px-6 py-4 text-center text-red-500">
                            Error loading data. Please try again later.
                        </td>
                    </tr>
                `;
            });
    }

    function updatePaginationButtons(totalItems, currentPage, itemsPerPage) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const pageNumbers = document.getElementById('page-numbers');
        const prevPage = document.getElementById('prev-page');
        const nextPage = document.getElementById('prev-page-mobile');
        const nextPageMobile = document.getElementById('next-page-mobile');
        const prevPageMobile = document.getElementById('prev-page');

        pageNumbers.innerHTML = '';

        if (currentPage <= 1) {
            prevPage?.classList.add('opacity-50', 'cursor-not-allowed');
            prevPageMobile?.classList.add('opacity-50', 'cursor-not-allowed');
            if (prevPage) prevPage.disabled = true;
            if (prevPageMobile) prevPageMobile.disabled = true;
        } else {
            prevPage?.classList.remove('opacity-50', 'cursor-not-allowed');
            prevPageMobile?.classList.remove('opacity-50', 'cursor-not-allowed');
            if (prevPage) prevPage.disabled = false;
            if (prevPageMobile) prevPageMobile.disabled = false;
        }

        if (currentPage >= totalPages) {
            nextPage?.classList.add('opacity-50', 'cursor-not-allowed');
            nextPageMobile?.classList.add('opacity-50', 'cursor-not-allowed');
            if (nextPage) nextPage.disabled = true;
            if (nextPageMobile) nextPageMobile.disabled = true;
        } else {
            nextPage?.classList.remove('opacity-50', 'cursor-not-allowed');
            nextPageMobile?.classList.remove('opacity-50', 'cursor-not-allowed');
            if (nextPage) nextPage.disabled = false;
            if (nextPageMobile) nextPageMobile.disabled = false;
        }

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                i === currentPage 
                    ? 'bg-primary border-primary text-white' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => fetchFlaggedPharmacies(i));
            pageNumbers.appendChild(pageButton);
        }
    }

    function fetchPharmacyDetails(pharmacyName) {
        fetch(`https://lyre-4m8l.onrender.com/get-flagged/${encodeURIComponent(pharmacyName)}/reports`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Pharmacy details:', data);
                alert(`Showing ${data.report_count} reports for ${pharmacyName}`);
            })
            .catch(error => {
                console.error('Error fetching pharmacy details:', error);
                alert(`Error loading details for ${pharmacyName}`);
            });
    }

    // Optimized nearby pharmacies functionality
    function getNearbyPharmacies() {
        locationPermission.classList.add('hidden');
        locationError.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        nearbyResults.innerHTML = `
            <div class="col-span-3 text-center py-12">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
                <p class="text-gray-600">Finding your location...</p>
                <p class="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </div>
        `;

        if (!navigator.geolocation) {
            showError('Geolocation not supported', 'Your browser does not support geolocation. Please try a different browser.');
            loadingSpinner.classList.add('hidden');
            return;
        }

        const geolocationOptions = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
        };

        const locationTimeout = setTimeout(() => {
            showError('Timeout', 'Getting your location is taking longer than expected. Please check your connection and try again.');
            loadingSpinner.classList.add('hidden');
        }, 16000);

        navigator.geolocation.getCurrentPosition(
            position => {
                clearTimeout(locationTimeout);
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                fetchNearbyPlaces(userLocation.lat, userLocation.lng);
            },
            error => {
                clearTimeout(locationTimeout);
                loadingSpinner.classList.add('hidden');
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        locationPermission.classList.remove('hidden');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        showError('Location unavailable', 'Location information is unavailable. Please check your network connection.');
                        break;
                    case error.TIMEOUT:
                        showError('Request timeout', 'The request to get your location timed out. Please try again in a better network area.');
                        break;
                    default:
                        showError('Location error', 'Could not determine your location. Please try again.');
                }
            },
            geolocationOptions
        );
    }

    function fetchNearbyPlaces(lat, lng) {
        nearbyResults.innerHTML = `
            <div class="col-span-3 text-center py-12">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
                <p class="text-gray-600">Finding nearby pharmacies...</p>
            </div>
        `;

        const fetchTimeout = setTimeout(() => {
            showError('Slow Connection', 'Fetching nearby locations is taking longer than expected. Please check your connection.');
            loadingSpinner.classList.add('hidden');
        }, 10000);

        fetch(`https://lyre-4m8l.onrender.com/get-nearby?lat=${lat}&lng=${lng}`)
            .then(response => {
                clearTimeout(fetchTimeout);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                nearbyPlaces = data;
                displayNearbyPlaces(data);
                updateMapWithLocation(lat, lng, data);
            })
            .catch(error => {
                clearTimeout(fetchTimeout);
                console.error('Error fetching nearby places:', error);
                showError('Network error', 'Failed to fetch nearby places. Please check your connection and try again.');
                loadingSpinner.classList.add('hidden');
            });
    }

    function displayNearbyPlaces(places) {
        loadingSpinner.classList.add('hidden');

        if (!places || places.length === 0) {
            nearbyResults.innerHTML = `
                <div class="col-span-3 text-center py-12 text-gray-500">
                    <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
                    <p>No nearby pharmacies or hospitals found. Try increasing the search radius.</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        places.forEach(place => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all';

            const badgeColor = place.type === 'Pharmacy' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';

            let contactInfo = '';
            if (place.phone) {
                contactInfo += `
                    <div class="flex items-center mt-2">
                        <i class="fas fa-phone-alt text-gray-500 mr-2"></i>
                        <a href="tel:${place.phone}" class="text-primary hover:underline">${place.phone}</a>
                    </div>
                `;
            }

            if (place.website) {
                contactInfo += `
                    <div class="flex items-center mt-2">
                        <i class="fas fa-globe text-gray-500 mr-2"></i>
                        <a href="${place.website}" target="_blank" class="text-primary hover:underline">Website</a>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="p-6">
                    <div class="flex justify-between items-start">
                        <h3 class="text-xl font-bold">${place.name}</h3>
                        <span class="text-xs px-2 py-1 rounded-full ${badgeColor}">${place.type}</span>
                    </div>
                    
                    <div class="mt-4">
                        <div class="flex items-start">
                            <i class="fas fa-map-marker-alt text-gray-500 mt-1 mr-2"></i>
                            <p class="text-gray-600">${place.address || 'Address not available'}</p>
                        </div>
                        
                        ${place.distance_meters ? `
                        <div class="flex items-center mt-2">
                            <i class="fas fa-walking text-gray-500 mr-2"></i>
                            <p class="text-sm text-gray-600">${Math.round(place.distance_meters)} meters away</p>
                        </div>
                        ` : ''}
                        
                        ${contactInfo}
                    </div>
                    
                    <div class="mt-4 pt-4 border-t border-gray-100">
                        <button class="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition w-full view-on-map" data-lat="${place.location.lat}" data-lng="${place.location.lng}">
                            <i class="fas fa-map-marker-alt mr-2"></i> View on Map
                        </button>
                    </div>
                </div>
            `;

            fragment.appendChild(card);
        });

        nearbyResults.innerHTML = '';
        nearbyResults.appendChild(fragment);
        showMapBtn.classList.remove('hidden');

        // Use event delegation for better performance
        nearbyResults.addEventListener('click', function(e) {
            const viewOnMapBtn = e.target.closest('.view-on-map');
            if (viewOnMapBtn) {
                e.preventDefault();
                const lat = parseFloat(viewOnMapBtn.getAttribute('data-lat'));
                const lng = parseFloat(viewOnMapBtn.getAttribute('data-lng'));

                if (nearbyMap) {
                    if (mapContainer.classList.contains('hidden')) {
                        toggleMap();
                    }
                    nearbyMap.setView([lat, lng], 16);
                }
            }
        });
    }

    function updateMapWithLocation(lat, lng, places) {
        if (!nearbyMap) return;

        nearbyMap.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.MarkerClusterGroup) {
                nearbyMap.removeLayer(layer);
            }
        });

        nearbyMap.setView([lat, lng], 14);

        const userIcon = L.icon({
            iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        L.marker([lat, lng], {
            icon: userIcon,
            zIndexOffset: 1000
        }).addTo(nearbyMap)
          .bindPopup('Your Location')
          .openPopup();

        const markerCluster = L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            chunkedLoading: true,
            chunkInterval: 100
        });

        places.forEach(place => {
            const placeIcon = L.icon({
                iconUrl: place.type === 'Pharmacy' ?
                    'https://cdn-icons-png.flaticon.com/512/484/484613.png' :
                    'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            const marker = L.marker([place.location.lat, place.location.lng], {
                icon: placeIcon
            }).bindPopup(`
                <h3 class="font-bold">${place.name}</h3>
                <p class="text-sm">${place.address || 'Address not available'}</p>
                ${place.phone ? `<p class="text-sm mt-1"><i class="fas fa-phone-alt mr-1"></i> ${place.phone}</p>` : ''}
            `);

            markerCluster.addLayer(marker);
        });

        nearbyMap.addLayer(markerCluster);
    }

    function toggleMap() {
        if (mapContainer.classList.contains('hidden')) {
            showMapBtn.innerHTML = '<i class="fas fa-map mr-2"></i> Hide Map';
            mapContainer.classList.remove('hidden');

            setTimeout(() => {
                if (nearbyMap) {
                    nearbyMap.invalidateSize();
                    if (userLocation) {
                        nearbyMap.setView([userLocation.lat, userLocation.lng], 14);
                    }
                }
            }, 10);
        } else {
            showMapBtn.innerHTML = '<i class="fas fa-map mr-2"></i> Show on Map';
            mapContainer.classList.add('hidden');
        }
    }

    function showError(title, message) {
        document.getElementById('error-title').textContent = title;
        document.getElementById('error-message').textContent = message;
        locationError.classList.remove('hidden');
    }

    // Add search button event listener
    const searchButton = document.getElementById('search-button');
    if (searchButton) {
        searchButton.addEventListener('click', () => fetchFlaggedPharmacies(1));
    }

    // Add event listeners for pagination buttons
    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) fetchFlaggedPharmacies(currentPage - 1);
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
        fetchFlaggedPharmacies(currentPage + 1);
    });
    document.getElementById('prev-page-mobile')?.addEventListener('click', () => {
        if (currentPage > 1) fetchFlaggedPharmacies(currentPage - 1);
    });
    document.getElementById('next-page-mobile')?.addEventListener('click', () => {
        fetchFlaggedPharmacies(currentPage + 1);
    });

    // Also add event listeners for form inputs to trigger search on change
    document.getElementById('sort-by')?.addEventListener('change', () => fetchFlaggedPharmacies(1));
    document.getElementById('sort-order')?.addEventListener('change', () => fetchFlaggedPharmacies(1));
    document.getElementById('per-page')?.addEventListener('change', () => fetchFlaggedPharmacies(1));

    // Add event listener for pharmacy details buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-pharmacy-details')) {
            const pharmacyName = decodeURIComponent(e.target.getAttribute('data-pharmacy'));
            fetchPharmacyDetails(pharmacyName);
        }
    });

    // Initial load
    fetchFlaggedPharmacies(1);
});