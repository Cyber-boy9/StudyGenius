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
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const MAX_SIMULTANEOUS_FILES = 2;

// Global variables
let activeUploads = 0;
let processingQueue = [];

// Get file input element
const fileInput = document.getElementById('fileInput');

// Add event listener to file input
fileInput.addEventListener('change', (event) => {
    handleFiles(event.target.files);
});

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
    
    // Get references to output elements; these are now declared globally in DOMContentLoaded
    // but it's good practice to ensure they exist if we manipulate them directly here.
    const summaryOutput = document.getElementById('summaryOutput');
    const analysisOutput = document.getElementById('analysisOutput');
    // quizOutput and quizSection are already global vars from DOMContentLoaded
    // chatMessagesContainer and chatSection are also global vars

    try {
        showLoading();
        updateProgress(0); // Initial progress
        
        createFilePreview(file);
        file.statusUpdatedOnError = false;
        
        // Clear previous outputs and hide sections for a new file processing
        if (summaryOutput) summaryOutput.innerHTML = '<p>Summary will appear here once the document is processed.</p>';
        if (document.getElementById('summarySection')) document.getElementById('summarySection').style.display = 'none';
        if (analysisOutput) analysisOutput.innerHTML = '<p>Analysis will appear here once the document is processed.</p>';
        if (document.getElementById('analysisSection')) document.getElementById('analysisSection').style.display = 'none';
        if (quizOutput) quizOutput.innerHTML = '';
        if (quizSection) quizSection.style.display = 'none';
        if (chatMessagesContainer) chatMessagesContainer.innerHTML = '';
        if (chatSection) chatSection.style.display = 'none';
        currentDocumentContext = null;

        // 1. Read File
        updateFilePreviewStatus(file, "Reading...");
        const content = await readFile(file);
        updateProgress(15); // Progress: 15%
        
        // 2. Generate Summary
        updateFilePreviewStatus(file, "Summarizing...");
        updateProgress(25);
        await generateSummary(content); // This function will make its own section visible on success
        updateProgress(45);
        
        // 3. Analyze Document
        updateFilePreviewStatus(file, "Analyzing Document...");
        updateProgress(55);
        await analyzeDocument(content); // This function will make its own section visible on success
        updateFilePreviewStatus(file, "Analysis Complete");
        updateProgress(75);
        
        // 4. Generate Questions
        updateFilePreviewStatus(file, "Generating Quiz...");
        updateProgress(85);
        await generateQuestions(content); // This function will make its own section visible on success
        updateFilePreviewStatus(file, "Quiz Ready");
        updateProgress(100);

        // Set document context for chat & final UI updates
        currentDocumentContext = content;
        if (chatMessagesContainer) {
            chatMessagesContainer.innerHTML = '';
            displayChatMessage("Document processed! Summary, analysis, and quiz are ready. Ask me anything!", "ai");
        }
        // Ensure chat section is visible (other sections are handled by their respective functions)
        if (chatSection) {
            chatSection.style.display = 'block';
            chatSection.classList.remove('fade-slide-in'); // Remove first to re-trigger
            void chatSection.offsetWidth; // Trigger reflow
            chatSection.classList.add('fade-slide-in');
        }
        
        showNotification(`Successfully processed ${file.name}: Summary, Analysis, and Quiz are ready!`, 'success');
    } catch (error) {
        // This catch block handles errors from readFile or if any of the AI functions re-throw errors
        // not caught by their internal try/catch.
        if (!file.statusUpdatedOnError) {
            updateFilePreviewStatus(file, "Error Processing");
        }

        const isSpecificApiError = error.message.includes("API Error") ||
                                   error.message.includes("Failed to extract") ||
                                   error.message.includes("Prompt blocked");

        if (!isSpecificApiError) {
            showNotification(`Critical error processing ${file.name}: ${error.message}`, 'error');
        }
        file.statusUpdatedOnError = true;
    } finally {
        hideLoading();
        activeUploads--;
        processNextFile();
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
        <div class="status-badge waiting">Waiting...</div>
    `;
    
    document.getElementById('filePreviewContainer').appendChild(preview);
}

function updateFilePreviewStatus(file, status) {
    const previews = document.querySelectorAll('.file-preview');
    for (const preview of previews) {
        const fileNameElement = preview.querySelector('.file-name');
        if (fileNameElement && fileNameElement.textContent === file.name) {
            const statusBadge = preview.querySelector('.status-badge');
            if (statusBadge) {
                statusBadge.textContent = status;
                statusBadge.className = `status-badge ${status.toLowerCase()}`;
            }
            break;
        }
    }
}

// Function to read file content
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            resolve(event.target.result);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        // Assuming text for now, adjust if binary is needed for Gemini
        reader.readAsText(file);
    });
}

// Gemini AI Integration Functions
async function generateSummary(fileContent) {
    const summaryOutput = document.getElementById('summaryOutput');
    const summarySection = document.getElementById('summarySection');
    
    try {
        const prompt = `Provide a detailed summary of the following document content:\n\n${fileContent}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Try to parse error, default to empty if fail
            console.error('Gemini API Error:', errorData);
            // Try to get a specific message from the API error structure
            const specificMessage = errorData?.error?.message || 'No specific error message provided by API.';
            throw new Error(`API Error: ${response.status} ${response.statusText}. ${specificMessage}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 &&
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0 &&
            data.candidates[0].content.parts[0].text
            ) {
            const summaryText = data.candidates[0].content.parts[0].text;
            summaryOutput.innerHTML = `<p>${summaryText.replace(/\n/g, '<br>')}</p>`;
            summarySection.style.display = 'block';
            summarySection.classList.remove('fade-slide-in'); // Remove first to re-trigger if needed
            void summarySection.offsetWidth; // Trigger reflow
            summarySection.classList.add('fade-slide-in');
            return summaryText;
        } else {
            console.error('Invalid response structure from Gemini API:', data);
            // Check for specific block reasons
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].finishReason) {
                 throw new Error(`Failed to extract summary. Reason: ${data.candidates[0].finishReason}. Check safety settings or prompt.`);
            }
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                throw new Error(`Prompt blocked. Reason: ${data.promptFeedback.blockReason}.`);
            }
            throw new Error('Failed to extract summary from API response due to invalid structure or missing text.');
        }

    } catch (error) {
        console.error('Error generating summary:', error);
        showNotification(`Error generating summary: ${error.message}`, 'error');
        summaryOutput.innerHTML = `<p class="error-message">Could not generate summary: ${error.message}</p>`;
        summarySection.style.display = 'block'; // Show section even if error to display message
        throw error; // Re-throw to be caught by processNextFile
    }
}

async function analyzeDocument(fileContent) {
    const analysisOutput = document.getElementById('analysisOutput');
    const analysisSection = document.getElementById('analysisSection');

    try {
        const prompt = `Analyze the following document content. Identify the most important sections, concepts, and topics.
Explain why these areas are critical for a student preparing for an exam on this material.
Present the analysis in a clear, structured format, suitable for study purposes. For example, use bullet points for key areas and brief explanations for their importance.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API Error (Analysis):', errorData);
            const specificMessage = errorData?.error?.message || 'No specific error message provided by API.';
            throw new Error(`API Error (Analysis): ${response.status} ${response.statusText}. ${specificMessage}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 &&
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0 &&
            data.candidates[0].content.parts[0].text
            ) {
            const analysisText = data.candidates[0].content.parts[0].text;
            // Basic formatting: replace newlines with <br> and try to make bullet points (heuristic)
            let formattedText = analysisText.replace(/\n\n/g, '<p></p>'); // Double newlines to paragraphs
            formattedText = formattedText.replace(/\n/g, '<br>'); // Single newlines to <br>
            formattedText = formattedText.replace(/•\s*/g, '<ul><li>'); // Start of bullet lists
            formattedText = formattedText.replace(/<br><ul><li>/g, '<ul><li>'); // Fix if <br> before <ul>
            formattedText = formattedText.replace(/<br>\s*-\s*/g, '</li><li>'); // List items
            formattedText = formattedText.replace(/<br>\s*\*\s*/g, '</li><li>'); // List items (asterisk)
            // Close any open <ul> tags at the end of sections if needed (simple heuristic)
            if (formattedText.includes('<ul><li>') && !formattedText.endsWith('</li></ul>')) {
                 if (formattedText.endsWith('</li>')) {
                    formattedText += '</ul>';
                 } else {
                    // Find last </li> and append </ul> if it makes sense
                    let lastLi = formattedText.lastIndexOf('</li>');
                    if (lastLi > -1 && lastLi + 5 < formattedText.length -10) { // check if not too close to end
                        // do nothing, might be complex structure
                    } else if (lastLi > -1) {
                         formattedText = formattedText.substring(0, lastLi + 5) + "</ul>" + formattedText.substring(lastLi+5);
                    }
                 }
            }
            // Ensure any list starts with <ul> and ends with </ul>
            if (formattedText.includes('<li>') && !formattedText.startsWith('<ul>')) {
                formattedText = '<ul>' + formattedText;
            }
            if (formattedText.includes('<li>') && !formattedText.endsWith('</ul>') && formattedText.endsWith('</li>')) {
                 formattedText += '</ul>';
            }


            analysisOutput.innerHTML = `<p>${formattedText}</p>`;
            analysisSection.style.display = 'block';
            analysisSection.classList.remove('fade-slide-in'); // Remove first to re-trigger
            void analysisSection.offsetWidth; // Trigger reflow
            analysisSection.classList.add('fade-slide-in');
            return analysisText;
        } else {
            console.error('Invalid response structure from Gemini API (Analysis):', data);
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].finishReason) {
                 throw new Error(`Failed to extract analysis. Reason: ${data.candidates[0].finishReason}. Check safety settings or prompt.`);
            }
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                throw new Error(`Prompt blocked for analysis. Reason: ${data.promptFeedback.blockReason}.`);
            }
            throw new Error('Failed to extract analysis from API response due to invalid structure or missing text.');
        }

    } catch (error) {
        console.error('Error generating analysis:', error);
        showNotification(`Error generating analysis: ${error.message}`, 'error');
        analysisOutput.innerHTML = `<p class="error-message">Could not generate analysis: ${error.message}</p>`;
        analysisSection.style.display = 'block';
        throw error;
    }
}

async function generateQuestions(fileContent) {
    if (!quizOutput || !quizSection) {
        console.error("Quiz UI elements not found.");
        // Potentially add a showNotification here if this state is critical
        return; // or throw new Error("Quiz UI not initialized");
    }
    quizOutput.innerHTML = ''; // Clear previous questions or error messages

    try {
        const prompt = `Based on the following document content, generate between 10 to 15 questions suitable for a quiz or exam.
These questions should test understanding of the core concepts and key information in the document.
Please format the questions as a numbered list (e.g., 1. Question text). Do not include answers.

Document Content:
---
${fileContent}
---
Generated Questions:`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // generationConfig: { temperature: 0.7, topK: 40 }, // Optional: Adjust creativity
                // safetySettings: [ // Optional: Adjust safety settings if needed
                //    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                // ],
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Graceful parsing
            console.error('Gemini API Error (Quiz):', errorData);
            const specificMessage = errorData?.error?.message || 'No specific error message from API.';
            throw new Error(`API Error (Quiz): ${response.status} ${response.statusText}. ${specificMessage}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 &&
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0 &&
            data.candidates[0].content.parts[0].text) {

            const questionsText = data.candidates[0].content.parts[0].text;
            // Attempt to split questions, assuming they are numbered and on new lines
            const questionsArray = questionsText.split('\n').map(q => q.trim()).filter(q => q.match(/^\d+\.\s*.+/));

            if (questionsArray.length > 0) {
                const ol = document.createElement('ol');
                questionsArray.forEach((questionText, index) => {
                    const li = document.createElement('li');
                    li.textContent = questionText.replace(/^\d+\.\s*/, '').trim();
                    // Apply animation class with a delay for staggering
                    // Ensure class is added after element is in DOM or visible for animation to trigger reliably
                    // However, for dynamically added items, this direct class add usually works.
                    li.classList.add('quiz-question-enter');
                    // JS-based stagger if CSS :nth-child is not sufficient or for more control
                    li.style.animationDelay = `${index * 0.1}s`;
                    ol.appendChild(li);
                });
                quizOutput.appendChild(ol);
            } else {
                quizOutput.innerHTML = `<p>Questions generated, but formatting might be off. Raw output:</p><pre>${questionsText}</pre>`;
                 if (questionsText.trim() === '') {
                    quizOutput.innerHTML = '<p>The AI generated an empty response for questions.</p>';
                 }
            }
            quizSection.style.display = 'block';
            quizSection.classList.remove('fade-slide-in'); // Remove first to re-trigger
            void quizSection.offsetWidth; // Trigger reflow
            quizSection.classList.add('fade-slide-in');
        } else {
            console.error('Invalid response structure from Gemini API (Quiz):', data);
            let errorMessage = 'Failed to extract questions from API response. ';
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].finishReason) {
                errorMessage += `Reason: ${data.candidates[0].finishReason}.`;
                 if (data.candidates[0].finishReason === "MAX_TOKENS") {
                    errorMessage += " The document might be too long for full question generation.";
                 }
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                errorMessage += `Prompt blocked. Reason: ${data.promptFeedback.blockReason}.`;
            } else {
                errorMessage += 'The response structure was unexpected.';
            }
            quizOutput.innerHTML = `<p class="error-message">${errorMessage}</p>`;
            quizSection.style.display = 'block'; // Show section to display this error
            throw new Error(errorMessage); // For console and notification
        }

    } catch (error) {
        console.error('Error generating questions:', error);
        // Ensure error message is displayed in the quizOutput if not already by API error handling
        if (!quizOutput.querySelector('.error-message')) {
             quizOutput.innerHTML = `<p class="error-message">Could not generate quiz: ${error.message}</p>`;
        }
        quizSection.style.display = 'block'; // Ensure section is visible for error
        showNotification(`Error generating quiz: ${error.message}`, 'error');
        throw error; // Re-throw for processNextFile to handle file status
    }
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

    // Chat UI Elements
    const chatInput = document.getElementById('chatInput');
    const sendChatButton = document.getElementById('sendChatButton');
    const chatMessagesContainer = document.getElementById('chatMessages');
    const chatSection = document.getElementById('chatSection');

    // Quiz UI Elements
    const quizSection = document.getElementById('quizSection');
    const quizOutput = document.getElementById('quizOutput');

    let currentDocumentContext = null; // Will hold the content of the processed document

    function displayChatMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        messageElement.textContent = message; // Using textContent for safety

        // Add a small delay to allow "Thinking..." to be removed properly before new message appears
        setTimeout(() => {
            chatMessagesContainer.appendChild(messageElement);
            messageElement.classList.add('chat-message-enter'); // Add animation class
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

            // Optionally remove class after animation to allow re-trigger if needed,
            // but for chat messages that persist, it's often not necessary.
            // setTimeout(() => {
            //    messageElement.classList.remove('chat-message-enter');
            // }, 300); // Duration of chatEnter animation
        }, 50); // Small delay for appending
    }

    async function getAIChatResponse(userMessage) {
        if (!currentDocumentContext) {
            throw new Error("Document context is not available for chat.");
        }

        const prompt = `Based on the following document content, please answer the user's question.
Document Content:
---
${currentDocumentContext}
---
User Question: "${userMessage}"

Answer directly based on the provided document content. If the answer cannot be found in the document, clearly state that.`;

        // Remove "Thinking..." message before sending new one or error
        const thinkingMessage = Array.from(chatMessagesContainer.children).find(
            msg => msg.textContent === "Thinking..." && msg.classList.contains('ai-message')
        );
        if (thinkingMessage) {
            chatMessagesContainer.removeChild(thinkingMessage);
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Gemini API Error (Chat):', errorData);
                const specificMessage = errorData?.error?.message || 'No specific error message from API.';
                throw new Error(`API Error (Chat): ${response.status} ${response.statusText}. ${specificMessage}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0 &&
                data.candidates[0].content && data.candidates[0].content.parts &&
                data.candidates[0].content.parts.length > 0 &&
                data.candidates[0].content.parts[0].text) {
                const aiResponseText = data.candidates[0].content.parts[0].text;
                displayChatMessage(aiResponseText, 'ai');
            } else {
                console.error('Invalid response structure from Gemini API (Chat):', data);
                let errorMessage = 'Failed to extract chat response from API due to invalid structure.';
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].finishReason) {
                    errorMessage += ` Reason: ${data.candidates[0].finishReason}.`;
                }
                if (data.promptFeedback && data.promptFeedback.blockReason) {
                    errorMessage += ` Prompt blocked. Reason: ${data.promptFeedback.blockReason}.`;
                }
                displayChatMessage(errorMessage, 'ai'); // Display technical error to user as AI message
                throw new Error(errorMessage); // Also throw for console/notification
            }

        } catch (error) {
            // Ensure "Thinking..." is removed if an error occurs before a message is displayed
            const stillThinking = Array.from(chatMessagesContainer.children).find(
                msg => msg.textContent === "Thinking..." && msg.classList.contains('ai-message')
            );
            if (stillThinking) {
                chatMessagesContainer.removeChild(stillThinking);
            }
            // Display a user-friendly error in chat, then rethrow for notification
            displayChatMessage(`Sorry, I couldn't get a response. Error: ${error.message}`, 'ai');
            throw error; // Re-throw for handleSendMessage to catch and show notification
        }
    }

    async function handleSendMessage() {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        if (!currentDocumentContext) {
            showNotification('Please upload and process a document before chatting.', 'error');
            return;
        }

        displayChatMessage(userMessage, 'user');
        chatInput.value = '';

        // Show a "Thinking..." message immediately after user's message
        displayChatMessage('Thinking...', 'ai');

        try {
            await getAIChatResponse(userMessage);
        } catch (error) {
            console.error("Error in getAIChatResponse:", error);
            // Remove "Thinking..." message if it's still there
            const thinkingMessage = Array.from(chatMessagesContainer.children).find(
                msg => msg.textContent === "Thinking..." && msg.classList.contains('ai-message')
            );
            if (thinkingMessage) {
                chatMessagesContainer.removeChild(thinkingMessage);
            }
            displayChatMessage(`Sorry, I encountered an error: ${error.message}`, 'ai');
            showNotification('Error communicating with AI.', 'error');
        }
    }

    if (sendChatButton) {
        sendChatButton.addEventListener('click', handleSendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission if chatInput is in a form
                handleSendMessage();
            }
        });
    }

    // Make the dropZone clickable to open file dialog
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());

        // Drag and drop event listeners
        dropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropZone.classList.add('dragover'); // Ensured this matches CSS .upload-box.dragover
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            dropZone.classList.remove('dragover');
            handleFiles(event.dataTransfer.files);
        });
    }

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const href = this.getAttribute('href');
            // Ensure href is not null and is a valid selector (starts with #)
            if (href && href.startsWith('#')) {
                const sectionId = href.substring(1); // Remove '#' to get ID
                const targetSection = document.getElementById(sectionId);

                if (targetSection) {
                    // Check if the section is visible (except for hero which is always scrollable to)
                    const isVisible = window.getComputedStyle(targetSection).display !== 'none';

                    if (isVisible || sectionId === 'hero') {
                        targetSection.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        // Optional: Notify user that section is not available yet
                        // showNotification(`The ${sectionId.replace('Section', '')} section is not available until a document is processed.`, 'info');
                        console.log(`Section ${sectionId} is not visible. Scrolling aborted.`);
                    }
                }
            }
        });
    });
});