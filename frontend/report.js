// Mobile Menu Toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

// Form elements
const reportForm = document.getElementById('reportForm');
const streetAddressInput = document.getElementById('street-address');
const stateSelect = document.getElementById('state');
const lgaInput = document.getElementById('lga');
const submitButton = document.getElementById('submit-button');
const buttonText = document.getElementById('button-text');
const buttonSpinner = document.getElementById('button-spinner');
const successModal = document.getElementById('success-modal');
const modalClose = document.getElementById('modal-close');
const locationPin = document.querySelector('.location-pin');
const flaggedContainer = document.querySelector('.flagged-container');

// Create hidden fields for coordinates if they don't exist
if (reportForm && !document.getElementById('latitude')) {
    const latInput = document.createElement('input');
    latInput.type = 'hidden';
    latInput.id = 'latitude';
    latInput.name = 'latitude';
    reportForm.appendChild(latInput);

    const lngInput = document.createElement('input');
    lngInput.type = 'hidden';
    lngInput.id = 'longitude';
    lngInput.name = 'longitude';
    reportForm.appendChild(lngInput);
}

// Mobile menu functionality
if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('hamburger-active');
        mobileMenu.classList.toggle('hidden');
    });

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

// Initialize Dropzone for image upload if element exists
if (document.getElementById('image-upload')) {
    Dropzone.autoDiscover = false;
    const myDropzone = new Dropzone("#image-upload", {
        url: "/fake-url",
        paramName: "image",
        maxFiles: 1,
        maxFilesize: 5,
        acceptedFiles: "image/*",
        addRemoveLinks: true,
        autoProcessQueue: false,
        dictDefaultMessage: "",
        dictFileTooBig: "File is too big ({{filesize}}MB). Max filesize: {{maxFilesize}}MB.",
        dictInvalidFileType: "Invalid file type. Only images are allowed.",
        dictRemoveFile: "Remove",
        init: function() {
            this.on("addedfile", function(file) {
                if (this.files.length > 1) {
                    this.removeFile(this.files[0]);
                }
            });

            this.on("removedfile", function() {
                if (document.getElementById('image-data')) {
                    document.getElementById('image-data').value = "";
                }
            });
        }
    });
}

// Location functionality
let isGeolocating = false;

// Update map display and store coordinates
function updateLocation(lat, lng, address = '') {
    if (flaggedContainer) {
        const infoDiv = flaggedContainer.querySelector('.absolute');
        if (infoDiv) {
            infoDiv.innerHTML = `
                <p class="text-sm text-gray-700">Location pinned at:</p>
                <p class="text-xs font-mono">${address || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`}</p>
            `;
        }
    }

    if (document.getElementById('latitude') && document.getElementById('longitude')) {
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;
    }

    if (address && streetAddressInput) {
        streetAddressInput.value = address;
    }
}

// Handle successful geolocation
async function handleGeolocationSuccess(position) {
    const { latitude, longitude } = position.coords;

    try {
        if (!navigator.onLine) {
            updateLocation(latitude, longitude, `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            throw new Error('No internet connection for address lookup');
        }

        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();

        const address = data.display_name || 'Location found';
        const state = data.address?.state;
        const county = data.address?.county || data.address?.city;

        // Update form fields
        if (state && stateSelect) {
            const stateOptions = Array.from(stateSelect.options).map(opt => opt.value);
            const matchedState = stateOptions.find(opt =>
                opt.toLowerCase().replace(/\s/g, '') === state.toLowerCase().replace(/\s/g, '')
            );

            if (matchedState) {
                stateSelect.value = matchedState;
                stateSelect.dispatchEvent(new Event('change'));
            }
        }

        if (county && lgaInput) {
            lgaInput.value = county;
        }

        updateLocation(latitude, longitude, address);
        showPinFeedback('#10b981', 'Location found!');
    } catch (error) {
        console.error('Geocoding error:', error);
        updateLocation(latitude, longitude, `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        showPinFeedback('#f59e0b', 'Location found but address lookup failed');
    }
}

// Handle geolocation errors
function handleGeolocationError(error) {
    console.error('Geolocation error:', error);
    showPinFeedback('#ef4444', 'Could not get location. Please enter manually.');
}

// Visual feedback for pin state
function showPinFeedback(color, message) {
    if (locationPin) {
        locationPin.style.backgroundColor = color;
    }

    if (flaggedContainer) {
        const infoDiv = flaggedContainer.querySelector('.absolute');
        if (infoDiv && message) {
            const feedback = document.createElement('p');
            feedback.className = 'text-sm text-gray-700';
            feedback.textContent = message;
            infoDiv.appendChild(feedback);

            setTimeout(() => {
                if (infoDiv.contains(feedback)) {
                    infoDiv.removeChild(feedback);
                }
            }, 3000);
        }
    }

    if (locationPin) {
        setTimeout(() => {
            locationPin.style.backgroundColor = '#ef4444';
        }, 2000);
    }
}

// Location pin click handler
if (locationPin) {
    locationPin.addEventListener('click', async () => {
        if (isGeolocating) return;
        isGeolocating = true;

        if (!navigator.geolocation) {
            alert('Geolocation not supported. Please enter address manually.');
            isGeolocating = false;
            return;
        }

        if (!confirm("Allow NexaHealth to access your location to fill the address automatically?")) {
            isGeolocating = false;
            return;
        }

        locationPin.style.backgroundColor = '#3b82f6';
        locationPin.style.animation = 'none';

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
            });

            await handleGeolocationSuccess(position);
        } catch (error) {
            handleGeolocationError(error);
        } finally {
            isGeolocating = false;
            setTimeout(() => {
                if (locationPin) {
                    locationPin.style.animation = 'bounce-slow 2s infinite';
                }
            }, 2000);
        }
    });
}

// Handle manual address input
if (streetAddressInput) {
    streetAddressInput.addEventListener('blur', () => {
        if (streetAddressInput.value.trim()) {
            if (flaggedContainer) {
                const infoDiv = flaggedContainer.querySelector('.absolute');
                if (infoDiv) {
                    infoDiv.innerHTML = `
                        <p class="text-sm text-gray-700">Location will be pinned based on address</p>
                    `;
                }
            }
            // Clear any existing coordinates
            if (document.getElementById('latitude') && document.getElementById('longitude')) {
                document.getElementById('latitude').value = '';
                document.getElementById('longitude').value = '';
            }
        }
    });
}

// State-LGA relationship
if (stateSelect) {
    stateSelect.addEventListener('change', function() {
        if (lgaInput) {
            if (this.value === "Lagos") {
                lgaInput.placeholder = "e.g. Ikeja, Surulere, Lagos Island";
            } else if (this.value === "Federal Capital Territory") {
                lgaInput.placeholder = "e.g. Municipal, Bwari, Gwagwalada";
            } else {
                lgaInput.placeholder = "e.g. Enter your LGA";
            }
        }
    });
}

// Form submission
if (reportForm) {
    reportForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate required fields
        const requiredFields = ['drug-name', 'pharmacy-name', 'description', 'state', 'lga'];
        let isValid = true;

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !field.value.trim()) {
                field.classList.add('animate__animated', 'animate__shake');
                setTimeout(() => {
                    if (field) {
                        field.classList.remove('animate__animated', 'animate__shake');
                    }
                }, 1000);
                isValid = false;
            }
        });

        if (!isValid) {
            alert('Please fill in all required fields');
            return;
        }

        // Show loading state
        if (buttonText && buttonSpinner && submitButton) {
            buttonText.textContent = "Submitting...";
            buttonSpinner.classList.remove('hidden');
            submitButton.disabled = true;
        }

        try {
            const formData = new FormData();
            formData.append('drug_name', document.getElementById('drug-name').value.trim());
            formData.append('nafdac_reg_no', document.getElementById('nafdac-number').value.trim());
            formData.append('pharmacy_name', document.getElementById('pharmacy-name').value.trim());
            formData.append('description', document.getElementById('description').value.trim());
            formData.append('state', document.getElementById('state').value);
            formData.append('lga', document.getElementById('lga').value.trim());
            formData.append('street_address', streetAddressInput.value.trim());

            // Add coordinates if available
            const lat = document.getElementById('latitude')?.value;
            const lng = document.getElementById('longitude')?.value;
            if (lat && lng) {
                formData.append('latitude', lat);
                formData.append('longitude', lng);
            }

            // Add image if uploaded
            const dropzone = Dropzone.forElement("#image-upload");
            if (dropzone && dropzone.files.length > 0) {
                formData.append('image', dropzone.files[0]);
            }

            const response = await fetch('https://lyre-4m8l.onrender.com/submit-report', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === "success" && successModal) {
                successModal.classList.remove('hidden');
                reportForm.reset();
                if (dropzone) {
                    dropzone.removeAllFiles(true);
                }
                if (document.getElementById('latitude') && document.getElementById('longitude')) {
                    document.getElementById('latitude').value = '';
                    document.getElementById('longitude').value = '';
                }
            } else {
                throw new Error(data.message || 'Error submitting report');
            }
        } catch (error) {
            console.error("Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            if (buttonText && buttonSpinner && submitButton) {
                buttonText.textContent = "Submit Report";
                buttonSpinner.classList.add('hidden');
                submitButton.disabled = false;
            }
        }
    });
}

// Close modal
if (modalClose && successModal) {
    modalClose.addEventListener('click', () => {
        successModal.classList.add('hidden');
    });
}

// Remove animation classes after animation completes
document.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('animationend', () => {
        element.classList.remove('animate__animated', 'animate__shake');
    });
});