// Mobile Menu Toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

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

// Initialize Dropzone for image upload
Dropzone.autoDiscover = false;
const myDropzone = new Dropzone("#image-upload", {
    url: "/fake-url", // We'll handle the upload manually
    paramName: "image",
    maxFiles: 1,
    maxFilesize: 5, // MB
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
            // Clear any stored image data
            document.getElementById('image-data').value = "";
        });
    }
});

// Form submission
const reportForm = document.getElementById('reportForm');
const submitButton = document.getElementById('submit-button');
const buttonText = document.getElementById('button-text');
const buttonSpinner = document.getElementById('button-spinner');
const successModal = document.getElementById('success-modal');
const modalClose = document.getElementById('modal-close');

reportForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Validate required fields
    const requiredFields = ['drug-name', 'pharmacy-name', 'description', 'state', 'lga'];
    let isValid = true;

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.classList.add('animate__animated', 'animate__shake');
            setTimeout(() => {
                field.classList.remove('animate__animated', 'animate__shake');
            }, 1000);
            isValid = false;
        }
    });

    if (!isValid) {
        alert('Please fill in all required fields');
        return;
    }

    // Show loading state
    buttonText.textContent = "Submitting...";
    buttonSpinner.classList.remove('hidden');
    submitButton.disabled = true;

    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('drug_name', document.getElementById('drug-name').value.trim());
        formData.append('nafdac_reg_no', document.getElementById('nafdac-number').value.trim());
        formData.append('pharmacy_name', document.getElementById('pharmacy-name').value.trim());
        formData.append('description', document.getElementById('description').value.trim());
        formData.append('state', document.getElementById('state').value);
        formData.append('lga', document.getElementById('lga').value.trim());
        formData.append('street_address', document.getElementById('street-address').value.trim());

        // Add image if uploaded
        if (myDropzone.files.length > 0) {
            formData.append('image', myDropzone.files[0]);
        }

        // Submit to backend
        const response = await fetch('http://localhost:8000/submit-report', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.status === "success") {
            // Show success modal
            successModal.classList.remove('hidden');
            // Reset form
            reportForm.reset();
            myDropzone.removeAllFiles(true);
        } else {
            throw new Error(data.message || 'Error submitting report');
        }
    } catch (error) {
        console.error("Error:", error);
        alert(`Error submitting report: ${error.message}`);
    } finally {
        // Reset button state
        buttonText.textContent = "Submit Report";
        buttonSpinner.classList.add('hidden');
        submitButton.disabled = false;
    }
});

// Close modal
modalClose.addEventListener('click', function() {
    successModal.classList.add('hidden');
});

// State-LGA relationship (simplified for demo)
document.getElementById('state').addEventListener('change', function() {
    const lgaInput = document.getElementById('lga');
    if (this.value === "Lagos") {
        lgaInput.placeholder = "e.g. Ikeja, Surulere, Lagos Island";
    } else if (this.value === "Federal Capital Territory") {
        lgaInput.placeholder = "e.g. Municipal, Bwari, Gwagwalada";
    } else {
        lgaInput.placeholder = "e.g. Enter your LGA";
    }
});

// Remove animation classes after animation completes
document.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('animationend', () => {
        element.classList.remove('animate__animated', 'animate__shake');
    });
});