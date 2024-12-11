class DogTrainer {
    constructor() {
        this.initializeUI();
        this.bindEvents();
        this.currentMode = 'stats'; // Default view
        this.currentQuizIndex = 0;
        this.quizScore = 0;
        this.quizQuestions = [];
        this.MAX_ATTEMPTS = 5;
        this.loadSounds();
        
        // Load breed stats immediately after initialization
        this.showBreedStats();
    }

    initializeUI() {
        const container = document.createElement('div');
        container.className = 'dog-trainer-container';
        container.innerHTML = `
            <div class="trainer-header">
                <h1>🐕 Barkle Dev Mode 🐕</h1>
                <div class="mode-selector">
                    <button class="mode-btn active" data-mode="stats">Breed Stats</button>
                    <button class="mode-btn" data-mode="difficulty">Difficulty Levels</button>
                    <button class="mode-btn" data-mode="search">Search Breeds</button>
                    <button class="mode-btn" data-mode="match">Breed Match</button>
                    <button class="mode-btn" data-mode="quiz">Custom Quiz</button>
                </div>
            </div>
            <div class="trainer-content">
                <!-- Content will be dynamically inserted here -->
            </div>
        `;
        document.body.appendChild(container);
        this.contentArea = container.querySelector('.trainer-content');
    }

    bindEvents() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
                // Update active button
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    async switchMode(mode) {
        this.currentMode = mode;
        this.contentArea.innerHTML = '<div class="loading">Loading...</div>';

        switch(mode) {
            case 'stats':
                await this.showBreedStats();
                break;
            case 'difficulty':
                await this.showDifficultyLevels();
                break;
            case 'search':
                this.showSearchInterface();
                break;
            case 'match':
                await this.showBreedMatch();
                break;
            case 'quiz':
                await this.showCustomQuiz();
                break;
        }
    }

    async showBreedStats() {
        try {
            const response = await fetch('/api/breeds/stats');
            const stats = await response.json();
            
            this.contentArea.innerHTML = `
                <div class="stats-display">
                    <div class="stat-card">
                        <h3>Total Breeds</h3>
                        <p class="stat-number">${stats.total_breeds}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Breeds with Sub-breeds</h3>
                        <p class="stat-number">${stats.breeds_with_sub_breeds}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total Sub-breeds</h3>
                        <p class="stat-number">${stats.total_sub_breeds}</p>
                    </div>
                    <div class="stat-update">
                        Last updated: ${new Date(stats.timestamp).toLocaleString()}
                    </div>
                </div>
            `;
        } catch (error) {
            this.showError('Failed to load breed statistics');
        }
    }

    async showDifficultyLevels() {
        try {
            const response = await fetch('/api/breeds/random/difficulty');
            const levels = await response.json();
            
            this.contentArea.innerHTML = `
                <div class="difficulty-display">
                    ${Object.entries(levels).map(([level, breeds]) => `
                        <div class="difficulty-section ${level}">
                            <h3>${level.toUpperCase()}</h3>
                            <ul>
                                ${breeds.map(breed => `
                                    <li>${breed}</li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            this.showError('Failed to load difficulty levels');
        }
    }

    showSearchInterface() {
        this.contentArea.innerHTML = `
            <div class="search-interface">
                <div class="search-box">
                    <input type="text" 
                           placeholder="Type a breed name..." 
                           id="breed-search-input">
                    <button onclick="dogTrainer.performSearch()">Search</button>
                </div>
                <div id="search-results"></div>
            </div>
        `;
    }

    async performSearch() {
        const query = document.getElementById('breed-search-input').value;
        try {
            const response = await fetch(`/api/breeds/search?q=${query}`);
            const results = await response.json();
            
            const resultsDiv = document.getElementById('search-results');
            resultsDiv.innerHTML = `
                <div class="search-results-container">
                    <h3>Found ${results.count} matches for "${results.query}"</h3>
                    <ul>
                        ${results.matches.map(breed => `
                            <li onclick="dogTrainer.analyzeBreed('${breed}')">${breed}</li>
                        `).join('')}
                    </ul>
                </div>
            `;
        } catch (error) {
            this.showError('Search failed');
        }
    }

    async analyzeBreed(breed) {
        try {
            const response = await fetch(`/api/breeds/image/analysis?breed=${breed}`);
            const analysis = await response.json();
            
            this.contentArea.innerHTML = `
                <div class="breed-analysis">
                    <h2>${breed}</h2>
                    <p>Total Images: ${analysis.total_images}</p>
                    <div class="sample-images">
                        ${analysis.sample_urls.map(url => `
                            <img src="${url}" alt="${breed}" loading="lazy">
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            this.showError('Failed to analyze breed');
        }
    }

    async showCustomQuiz() {
        try {
            const response = await fetch('/api/breeds/quiz/generate');
            const quiz = await response.json();
            this.quizQuestions = quiz.questions;
            this.currentQuizIndex = 0;
            this.quizScore = 0;
            
            // Show first question
            this.showCurrentQuestion();
        } catch (error) {
            this.showError('Failed to load quiz');
        }
    }

    showCurrentQuestion() {
        const question = this.quizQuestions[this.currentQuizIndex];
        
        this.contentArea.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-progress">
                    Question ${this.currentQuizIndex + 1}/${this.MAX_ATTEMPTS}
                    <span class="score">Score: ${this.quizScore}</span>
                </div>
                <div class="quiz-question">
                    <div class="image-container">
                        <img src="${question.image_url}" alt="Dog breed" class="quiz-image">
                        <div class="feedback-overlay"></div>
                    </div>
                    <div class="options">
                        ${question.options.map((option, index) => `
                            <button 
                                class="quiz-option"
                                onclick="dogTrainer.checkQuizAnswer(${index}, ${question.correct_index})">
                                ${option.charAt(0).toUpperCase() + option.slice(1)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    checkQuizAnswer(selectedIndex, correctIndex) {
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(option => option.disabled = true);
        
        const isCorrect = selectedIndex === correctIndex;
        if (isCorrect) {
            this.quizScore++;
            this.happyBark.play();
        } else {
            this.sadBark.play();
        }
        
        // Show feedback overlay
        const feedbackOverlay = document.querySelector('.feedback-overlay');
        
        // Check if this is the last question
        if (this.currentQuizIndex === this.MAX_ATTEMPTS - 1) {
            // Show final score immediately
            feedbackOverlay.innerHTML = `
                <div class="quiz-feedback">
                    <h3>Quiz Complete!</h3>
                    <p class="final-score">You got ${this.quizScore} out of ${this.MAX_ATTEMPTS} correct!</p>
                    <button onclick="location.reload()">Play Again</button>
                </div>
            `;
        } else {
            // Show regular feedback for non-final questions
            feedbackOverlay.innerHTML = `
                <div class="quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}">
                    <p>${isCorrect ? '🎉 Correct!' : '😢 Incorrect! It was ' + 
                        this.quizQuestions[this.currentQuizIndex].breed}</p>
                    <button class="next-question">Next Question</button>
                </div>
            `;
            
            // Add event listener for next question
            const actionButton = feedbackOverlay.querySelector('button');
            actionButton.onclick = () => {
                this.currentQuizIndex++;
                this.showCurrentQuestion();
            };
        }
        
        feedbackOverlay.style.display = 'flex';
    }

    showError(message) {
        this.contentArea.innerHTML = `
            <div class="error-message">
                <p>🐕 ${message} 🐕</p>
                <button onclick="dogTrainer.switchMode('${this.currentMode}')">Try Again</button>
            </div>
        `;
    }

    loadSounds() {
        this.happyBark = new Audio('/static/happy_bark.mp3');
        this.sadBark = new Audio('/static/angry_bark.mp3');
        
        // Silently handle sound loading errors
        this.happyBark.onerror = () => {
            console.error('Failed to load happy bark sound');
            this.happyBark.play = () => {}; // Replace with empty function
        };
        this.sadBark.onerror = () => {
            console.error('Failed to load sad bark sound');
            this.sadBark.play = () => {}; // Replace with empty function
        };
    }

    async showBreedMatch() {
        try {
            const response = await fetch('/api/breeds/match');
            const data = await response.json();
            
            this.contentArea.innerHTML = `
                <div class="breed-match">
                    <h2>Match the Breeds! 🎯</h2>
                    <div class="match-container">
                        ${data.pairs.map((pair, index) => `
                            <div class="match-card">
                                <img src="${pair.image_url}" alt="Mystery dog ${index + 1}" loading="lazy">
                                <div class="match-overlay">
                                    <button class="reveal-btn" 
                                            onclick="dogTrainer.revealBreed(this, '${pair.display_name}')">
                                        Reveal Breed
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="next-match" onclick="dogTrainer.showBreedMatch()">
                        Next Match
                    </button>
                </div>
            `;
        } catch (error) {
            this.showError('Failed to load breed match');
        }
    }

    revealBreed(button, breedName) {
        const card = button.closest('.match-card');
        button.innerHTML = breedName;
        button.classList.add('revealed');
        this.happyBark.play();
        
        // Check if all breeds are revealed
        const allRevealed = [...document.querySelectorAll('.reveal-btn')]
            .every(btn => btn.classList.contains('revealed'));
        
        if (allRevealed) {
            document.querySelector('.next-match').style.display = 'block';
        }
    }
}

// Initialize when page loads
window.onload = () => {
    window.dogTrainer = new DogTrainer();
}; 