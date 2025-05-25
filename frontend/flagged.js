// flagged.js - JavaScript for flagged.html with real API calls

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

    // Initialize Main Map (Flagged Pharmacies)
    const mainMap = L.map('pharmacy-map').setView([9.0820, 8.6753], 6); // Center on Nigeria
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mainMap);

    // Icon for flagged pharmacies
    const pharmacyIcon = L.icon({
        iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    // Fetch and display flagged pharmacies
    fetchFlaggedPharmacies();

    // Nearby Pharmacies Functionality
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

    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getNearbyPharmacies);
    }

    if (showMapBtn) {
        showMapBtn.addEventListener('click', toggleMap);
    }

    function fetchFlaggedPharmacies() {
        const pharmacyResults = document.getElementById('pharmacy-results');
        if (!pharmacyResults) return;

        // Show loading state
        pharmacyResults.innerHTML = `
            <tr class="animate-pulse">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-1/4"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-full"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-8 bg-gray-200 rounded w-20"></div>
                </td>
            </tr>
            <tr class="animate-pulse">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-1/4"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-4 bg-gray-200 rounded w-full"></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="h-8 bg-gray-200 rounded w-20"></div>
                </td>
            </tr>
        `;

        // Fetch flagged pharmacies from API
        fetch('https://localhost:8000/get-flagged')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Update the table with real data
                pharmacyResults.innerHTML = '';

                if (data.flagged_pharmacies && data.flagged_pharmacies.length > 0) {
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
                    });

                    // Add markers to the map
                    data.flagged_pharmacies.forEach(pharmacy => {
                        if (pharmacy.lat && pharmacy.lng) {
                            const marker = L.marker([pharmacy.lat, pharmacy.lng], {icon: pharmacyIcon}).addTo(mainMap);

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
                        }
                    });

                    // Add event listeners for details buttons
                    document.querySelectorAll('.view-pharmacy-details').forEach(button => {
                        button.addEventListener('click', function() {
                            const pharmacyName = decodeURIComponent(this.getAttribute('data-pharmacy'));
                            fetchPharmacyDetails(pharmacyName);
                        });
                    });
                } else {
                    pharmacyResults.innerHTML = `
                        <tr>
                            <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                                No flagged pharmacies found
                            </td>
                        </tr>
                    `;
                }

                // Update summary stats
                if (data.summary) {
                    document.getElementById('total-pharmacies').textContent = data.summary.total_flagged_pharmacies || '0';
                    document.getElementById('total-reports').textContent = data.summary.total_reports || '0';

                    if (data.summary.top_drugs && data.summary.top_drugs.length > 0) {
                        document.getElementById('top-drug').textContent = data.summary.top_drugs[0].drug_name || 'None';
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching flagged pharmacies:', error);
                pharmacyResults.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-4 text-center text-red-500">
                            Error loading flagged pharmacies. Please try again later.
                        </td>
                    </tr>
                `;
            });
    }

    function fetchPharmacyDetails(pharmacyName) {
        // Fetch detailed reports for a specific pharmacy
        fetch(`https://localhost:8000/get-flagged/${encodeURIComponent(pharmacyName)}/reports`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Here you would show the detailed reports in a modal or new page
                console.log('Pharmacy details:', data);
                alert(`Showing ${data.report_count} reports for ${pharmacyName}`);
                // In a real app, you would display this data properly
            })
            .catch(error => {
                console.error('Error fetching pharmacy details:', error);
                alert(`Error loading details for ${pharmacyName}`);
            });
    }

    function getNearbyPharmacies() {
        // Reset UI
        locationPermission.classList.add('hidden');
        locationError.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        nearbyResults.innerHTML = '';

        // Check if geolocation is supported
        if (!navigator.geolocation) {
            showError('Geolocation not supported', 'Your browser does not support geolocation. Please try a different browser.');
            loadingSpinner.classList.add('hidden');
            return;
        }

        // Get current position
        navigator.geolocation.getCurrentPosition(
            position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                fetchNearbyPlaces(userLocation.lat, userLocation.lng);
            },
            error => {
                loadingSpinner.classList.add('hidden');
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        locationPermission.classList.remove('hidden');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        showError('Location unavailable', 'Location information is unavailable.');
                        break;
                    case error.TIMEOUT:
                        showError('Request timeout', 'The request to get user location timed out.');
                        break;
                    default:
                        showError('Unknown error', 'An unknown error occurred while getting your location.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    function fetchNearbyPlaces(lat, lng) {
        fetch(`https://localhost:8000/get-nearby?lat=${lat}&lng=${lng}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                nearbyPlaces = data;
                displayNearbyPlaces(data);
            })
            .catch(error => {
                console.error('Error fetching nearby places:', error);
                showError('Network error', 'Failed to fetch nearby places. Please try again later.');
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

        nearbyResults.innerHTML = '';

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

            let hoursInfo = '';
            if (place.opening_hours) {
                hoursInfo = `
                    <div class="mt-3 pt-3 border-t border-gray-100">
                        <div class="flex items-center">
                            <i class="fas fa-clock text-gray-500 mr-2"></i>
                            <span class="text-sm font-medium">Opening Hours:</span>
                        </div>
                        <p class="text-sm text-gray-600 mt-1">${place.opening_hours}</p>
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
                        ${hoursInfo}
                    </div>
                    
                    <div class="mt-4 pt-4 border-t border-gray-100">
                        <button class="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition w-full view-on-map" data-lat="${place.location.lat}" data-lng="${place.location.lng}">
                            <i class="fas fa-map-marker-alt mr-2"></i> View on Map
                        </button>
                    </div>
                </div>
            `;

            nearbyResults.appendChild(card);
        });

        // Show the map button if we have results
        showMapBtn.classList.remove('hidden');

        // Add click handlers for "View on Map" buttons
        document.querySelectorAll('.view-on-map').forEach(button => {
            button.addEventListener('click', function() {
                const lat = parseFloat(this.getAttribute('data-lat'));
                const lng = parseFloat(this.getAttribute('data-lng'));

                if (!mapContainer.classList.contains('hidden')) {
                    nearbyMap.setView([lat, lng], 16);
                } else {
                    toggleMap();
                    setTimeout(() => {
                        nearbyMap.setView([lat, lng], 16);
                    }, 300);
                }
            });
        });
    }

    function toggleMap() {
        if (mapContainer.classList.contains('hidden')) {
            // Initialize the map if not already done
            if (!nearbyMap) {
                initializeNearbyMap();
            }
            showMapBtn.innerHTML = '<i class="fas fa-map mr-2"></i> Hide Map';
            mapContainer.classList.remove('hidden');
        } else {
            showMapBtn.innerHTML = '<i class="fas fa-map mr-2"></i> Show on Map';
            mapContainer.classList.add('hidden');
        }
    }

    function initializeNearbyMap() {
        if (!userLocation || !nearbyPlaces || nearbyPlaces.length === 0) return;

        nearbyMap = L.map('nearby-map').setView([userLocation.lat, userLocation.lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(nearbyMap);

        // Add user location marker
        const userIcon = L.icon({
            iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        L.marker([userLocation.lat, userLocation.lng], {
            icon: userIcon,
            zIndexOffset: 1000
        }).addTo(nearbyMap)
          .bindPopup('Your Location')
          .openPopup();

        // Add nearby places markers
        nearbyPlaces.forEach(place => {
            const placeIcon = L.icon({
                iconUrl: place.type === 'Pharmacy' ?
                    'https://cdn-icons-png.flaticon.com/512/484/484613.png' :
                    'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            L.marker([place.location.lat, place.location.lng], {
                icon: placeIcon
            }).addTo(nearbyMap)
              .bindPopup(`
                <h3 class="font-bold">${place.name}</h3>
                <p class="text-sm">${place.address || 'Address not available'}</p>
                ${place.phone ? `<p class="text-sm mt-1"><i class="fas fa-phone-alt mr-1"></i> ${place.phone}</p>` : ''}
              `);
        });
    }

    function showError(title, message) {
        document.getElementById('error-title').textContent = title;
        document.getElementById('error-message').textContent = message;
        locationError.classList.remove('hidden');
    }
});