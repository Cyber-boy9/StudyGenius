// Initialize particle.js
particlesJS('particles', {
    particles: {
        number: {
            value: 80,
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: '#7C3AED'
        },
        opacity: {
            value: 0.2,
            random: false,
        },
        size: {
            value: 3,
            random: true,
        },
        line_linked: {
            enable: true,
            distance: 150,
            color: '#7C3AED',
            opacity: 0.1,
            width: 1
        },
        move: {
            enable: true,
            speed: 2,
            direction: 'none',
            random: false,
            straight: false,
            out_mode: 'out',
            bounce: false,
        }
    },
    interactivity: {
        detect_on: 'canvas',
        events: {
            onhover: {
                enable: true,
                mode: 'grab'
            },
            onclick: {
                enable: true,
                mode: 'push'
            },
            resize: true
        }
    },
    retina_detect: true
});

// Gemini AI configuration
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your API key
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const MAX_SIMULTANEOUS_FILES = 2;

// Global variables
let activeUploads = 0;
let processingQueue = [];

// Enhanced file handling
async function handleFiles(files) {
    const fileArray = Array.from(files);
    
    // Validate number of files
    if (fileArray.length > MAX_SIMULTANEOUS_FILES) {
        showNotification('Please upload up to 2 files at a time', 'error');
        return;
    }

    // Validate file sizes and types
    for (const file of fileArray) {
        if (file.size > MAX_FILE_SIZE) {
            showNotification(`File ${file.name} exceeds 20MB limit`, 'error');
            continue;
        }

        if (!isValidFileType(file)) {
            showNotification(`File type ${file.type} is not supported`, 'error');
            continue;
        }

        // Add to processing queue
        processingQueue.push(file);
    }

    // Process files in queue
    processNextFile();
}

function isValidFileType(file) {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ];
    return allowedTypes.includes(file.type);
}

async function processNextFile() {
    if (activeUploads >= MAX_SIMULTANEOUS_FILES || processingQueue.length === 0) {
        return;
    }

    activeUploads++;
    const file = processingQueue.shift();
    
    try {
        showLoading();
        updateProgress(0);
        
        // Create file preview
        createFilePreview(file);
        
        // Read file content
        const content = await readFile(file);
        updateProgress(30);
        
        // Process with Gemini AI
        const summary = await generateSummary(content);
        updateProgress(60);
        
        const analysis = await analyzeDocument(content);
        updateProgress(80);
        
        const questions = await generateQuestions(content);
        updateProgress(100);
        
        // Display results
        displayResults(file.name, summary, analysis, questions);
        
        showNotification(`Successfully processed ${file.name}`, 'success');
    } catch (error) {
        showNotification(`Error processing ${file.name}: ${error.message}`, 'error');
    } finally {
        hideLoading();
        activeUploads--;
        processNextFile(); // Process next file in queue
    }
}

// UI Functions
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('progressBar').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('progressBar').style.display = 'none';
}

function updateProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.setProperty('--progress', `${percent}%`);
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notificationContainer').appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function createFilePreview(file) {
    const preview = document.createElement('div');
    preview.className = 'file-preview fade-slide-in';
    preview.innerHTML = `
        <div class="file-info">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
        <div class="status-badge processing">Processing...</div>
    `;
    
    document.getElementById('filePreviewContainer').appendChild(preview);
}

// Gemini AI Integration Functions
async function generateSummary(content) {
    // Replace with actual Gemini AI API call
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `Generate a detailed summary of the following content: ${content}`
                }]
            }]
        })
    });
    
    return response.json();
}

async function analyzeDocument(content) {
    // Similar implementation for document analysis
}

async function generateQuestions(content) {
    // Similar implementation for question generation
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add animation to elements when they enter viewport
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-slide-in');
            }
        });
    });

    document.querySelectorAll('.hero-section, .features-section > *').forEach((el) => {
        observer.observe(el);
    });
});