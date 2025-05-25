// flagged.js - JavaScript for flagged.html

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

    // Add sample markers for flagged pharmacies
    const pharmacyIcon = L.icon({
        iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    // Sample data - in a real app, this would come from your API
    const samplePharmacies = [
        {
            pharmacy: "HealthPlus Pharmacy",
            state: "Lagos",
            lga: "Ikeja",
            street_address: "123 Allen Avenue",
            report_count: 8,
            drugs: ["Paracetamol", "Coartem"],
            lat: 6.6018,
            lng: 3.3515
        },
        {
            pharmacy: "MedPlus Pharmacy",
            state: "Lagos",
            lga: "Victoria Island",
            street_address: "45A Adeola Odeku",
            report_count: 5,
            drugs: ["Amoxicillin", "Ibuprofen"],
            lat: 6.4281,
            lng: 3.4219
        },
        {
            pharmacy: "Alpha Pharmacy",
            state: "Abuja",
            lga: "Wuse",
            street_address: "22 Aminu Kano Crescent",
            report_count: 3,
            drugs: ["Paracetamol"],
            lat: 9.0765,
            lng: 7.4726
        },
        {
            pharmacy: "Merit Healthcare",
            state: "Rivers",
            lga: "Port Harcourt",
            street_address: "17 Aba Road",
            report_count: 6,
            drugs: ["Coartem", "Amoxicillin"],
            lat: 4.8156,
            lng: 7.0498
        },
        {
            pharmacy: "LifeCare Pharmacy",
            state: "Kano",
            lga: "Nasarawa",
            street_address: "12 Zaria Road",
            report_count: 4,
            drugs: ["Ibuprofen", "Paracetamol"],
            lat: 12.0022,
            lng: 8.5136
        }
    ];

    // Add markers to main map
    samplePharmacies.forEach(pharmacy => {
        const marker = L.marker([pharmacy.lat, pharmacy.lng], {icon: pharmacyIcon}).addTo(mainMap);

        let drugsList = '';
        pharmacy.drugs.forEach(drug => {
            drugsList += `<span class="badge bg-red-100 text-red-800">${drug}</span>`;
        });

        marker.bindPopup(`
            <h3>${pharmacy.pharmacy}</h3>
            <p><strong>Location:</strong> ${pharmacy.street_address}, ${pharmacy.lga}, ${pharmacy.state}</p>
            <p><strong>Reports:</strong> ${pharmacy.report_count}</p>
            <div class="mt-2">
                <p class="font-medium">Flagged Drugs:</p>
                <div class="mt-1">${drugsList}</div>
            </div>
            <div class="mt-3 text-center">
                <button class="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-secondary transition">
                    View Details
                </button>
            </div>
        `);
    });

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
        // In a real app, you would call your backend API endpoint
        fetch(`http/get-nearby?lat=${lat}&lng=${lng}`)
          .then(response => response.json())
          .then(data => displayNearbyPlaces(data))
           .catch(error => {
                console.error('Error fetching nearby places:', error);
                 showError('Network error', 'Failed to fetch nearby places. Please try again later.');
                 loadingSpinner.classList.add('hidden');
           });

        // For demo purposes, we'll use a mock response
        setTimeout(() => {
            const mockResponse = [
                {
                    "name": "Life Pharmacy",
                    "type": "Pharmacy",
                    "location": {
                        "lat": lat + 0.001,
                        "lng": lng + 0.001
                    },
                    "address": "123 Powerline Street, Akobo, Ibadan, Oyo",
                    "phone": "+2348012345678",
                    "website": "http://lifepharmacy.ng",
                    "opening_hours": "Mo-Sa 08:00-20:00",
                    "distance_meters": 450
                },
                {
                    "name": "General Hospital",
                    "type": "Hospital",
                    "location": {
                        "lat": lat - 0.002,
                        "lng": lng + 0.0015
                    },
                    "address": "Akobo Ojurin, Lagelu, Ibadan, Oyo",
                    "phone": "+2348023456789",
                    "website": null,
                    "opening_hours": "24/7",
                    "distance_meters": 800
                },
                {
                    "name": "MedPlus Pharmacy",
                    "type": "Pharmacy",
                    "location": {
                        "lat": lat + 0.003,
                        "lng": lng - 0.001
                    },
                    "address": "45 Ring Road, Ibadan, Oyo",
                    "phone": "+2348034567890",
                    "website": "http://medpluspharmacy.com",
                    "opening_hours": "Mo-Su 07:00-22:00",
                    "distance_meters": 1200
                }
            ];

            nearbyPlaces = mockResponse;
            displayNearbyPlaces(mockResponse);
        }, 1500);
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
                            <p class="text-gray-600">${place.address}</p>
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
                <p class="text-sm">${place.address}</p>
                ${place.phone ? `<p class="text-sm mt-1"><i class="fas fa-phone-alt mr-1"></i> ${place.phone}</p>` : ''}
              `);
        });

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

    function showError(title, message) {
        document.getElementById('error-title').textContent = title;
        document.getElementById('error-message').textContent = message;
        locationError.classList.remove('hidden');
    }

    // For demo purposes, we'll simulate fetching flagged pharmacy data
    setTimeout(() => {
        // Update the pharmacy results table
        const pharmacyResults = document.getElementById('pharmacy-results');
        if (pharmacyResults) {
            pharmacyResults.innerHTML = '';

            samplePharmacies.forEach(pharmacy => {
                let drugsList = '';
                pharmacy.drugs.forEach(drug => {
                    drugsList += `<span class="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">${drug}</span>`;
                });

                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-medium">${pharmacy.pharmacy}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div>${pharmacy.street_address}, ${pharmacy.lga}</div>
                        <div class="text-sm text-gray-500">${pharmacy.state}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">${pharmacy.report_count} reports</span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-wrap">${drugsList}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button class="text-primary hover:text-secondary font-medium">Details</button>
                    </td>
                `;

                pharmacyResults.appendChild(row);
            });
        }

        // Update summary stats
        document.getElementById('total-pharmacies').textContent = samplePharmacies.length;
        document.getElementById('total-reports').textContent = samplePharmacies.reduce((sum, p) => sum + p.report_count, 0);
        document.getElementById('top-drug').textContent = 'Paracetamol';
    }, 1000);
});