class BarkleGame {
    constructor() {
        this.errorMessages = {
            general: "Ruh roh! Something went wrong. Let's fetch those dog pics again!",
            network: "Woof! Seems like our dog pics are playing hide and seek. Try again?",
            image: "Paw snap! This puppy picture is being stubborn. Fetching another...",
            api: "Our dog database is taking a nap. Come back later today!"
        };
        this.MAX_ATTEMPTS = 5;  // Number of guesses allowed per day
        this.attempts = [];     // Track all guesses
        this.gameOver = false;

        // Initialize game date first and check if it's current
        const savedGameDate = localStorage.getItem('gameDate');
        const today = new Date();
        
        // Clear state if it's a new day
        if (savedGameDate) {
            const savedDate = new Date(savedGameDate);
            if (savedDate.toDateString() !== today.toDateString()) {
                // It's a new day, clear ALL previous game state
                this.clearGameState();
                this.gameDate = today;
            } else {
                this.gameDate = savedDate;
            }
        } else {
            this.gameDate = today;
        }
        
        // Save current game date
        localStorage.setItem('gameDate', this.gameDate.toDateString());
        
        // Generate seed after date is initialized
        this.todaysSeed = this.generateSeedFromDate(this.gameDate);
        
        // Initialize remaining properties
        this.loadGameState();
        this.loadSounds();
        this.initialize();
        
        // Get player name from localStorage or prompt for it
        this.playerName = localStorage.getItem('playerName');
        if (!this.playerName) {
            this.promptForName();
        }

        // Generate or retrieve unique device ID
        this.deviceId = localStorage.getItem('deviceId') || this.generateDeviceId();
        localStorage.setItem('deviceId', this.deviceId);

        // Initialize streak tracking
        this.initializeStreak();

        const todayString = today.toDateString();
        
        // Initialize localStorage variables if they don't exist
        if (!localStorage.getItem('gameDate')) {
            localStorage.setItem('gameDate', todayString);
        }
        if (!localStorage.getItem('lastPlayedDate')) {
            localStorage.setItem('lastPlayedDate', todayString);
        }
        if (!localStorage.getItem('yesterdayPlayed')) {
            localStorage.setItem('yesterdayPlayed', 'false');
        }

        // Check if it's a new day and reset yesterdayPlayed
        const lastPlayedDate = localStorage.getItem('lastPlayedDate');
        if (lastPlayedDate !== todayString) {
            // Only reset yesterdayPlayed at the start of a new day
            localStorage.setItem('yesterdayPlayed', 'false');
            localStorage.setItem('lastPlayedDate', todayString);
        }

        // Check if we're returning from yesterday's game
        const todayState = JSON.parse(localStorage.getItem('todayState') || 'null');
        if (todayState && todayState.played && todayState.gameDate === todayString) {
            // Restore today's game state
            if (todayState.barkleState) {
                localStorage.setItem('barkleState', todayState.barkleState);
                // Parse the state to check if game is completed
                const savedState = JSON.parse(todayState.barkleState);
                if (savedState.gameOver) {
                    this.gameOver = true;
                    this.attempts = savedState.attempts || [];
                    this.score = savedState.score || 0;
                }
            }
            if (todayState.gameDate) {
                localStorage.setItem('gameDate', todayState.gameDate);
            }
        }

        // Check if today's game is already completed
        const completedState = JSON.parse(localStorage.getItem('barkleState') || '{}');
        if (completedState.gameOver && completedState.gameDate === todayString) {
            // User has already completed today's game
            this.gameOver = true;
            this.attempts = completedState.attempts || [];
            this.score = completedState.score || 0;
            
            // Skip normal initialization and show completion modal
            this.loadSounds();
            this.initialize();
            return;
        }
    }

    generateDeviceId() {
        // UUID v4 implementation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    promptForName() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>🐕 Welcome to Barkle! 🐕</h2>
                <p>What should we call you?</p>
                <input type="text" 
                       id="player-name" 
                       maxlength="12"
                       placeholder="Your name"
                       class="name-input"
                       value="${this.playerName || ''}">
                <button class="option-btn" id="save-name">Start Playing</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Add these styles if not already in your CSS
        const style = document.createElement('style');
        style.textContent = `
            .name-input {
                padding: 10px;
                margin: 10px 0;
                width: 100%;
                border: 2px solid #538d4e;
                border-radius: 5px;
                background: #1a1a1b;
                color: white;
                font-size: 1.1em;
            }
            
            .name-input:focus {
                outline: none;
                border-color: #66aa61;
            }
        `;
        document.head.appendChild(style);

        const input = modal.querySelector('#player-name');
        const button = modal.querySelector('#save-name');

        const saveName = () => {
            let name = input.value.trim();
            if (name === '') name = 'Anonymous';
            if (this.containsBadWords(name)) {
                alert('Please choose a different name.');
                return;
            }
            this.playerName = name;  // Store in class
            localStorage.setItem('playerName', name);  // Store in localStorage
            modal.remove();
        };

        button.onclick = saveName;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') saveName();
        };
    }

    containsBadWords(name) {
        const badWords = ['bitch', 'nig', 'fuck']; // Add more bad words as needed
        const lowerCaseName = name.toLowerCase();
        
        // Split the name into words and check each word
        const words = lowerCaseName.split(/[\s-_]+/);
        
        // Check if any complete word matches a bad word
        for (const word of words) {
            // Remove any non-letter characters
            const cleanWord = word.replace(/[^a-z]/g, '');
            if (badWords.includes(cleanWord)) {
                return true;
            }
            
            // Also check for common number substitutions
            const numberSubstitutions = cleanWord
                .replace(/1/g, 'i')
                .replace(/3/g, 'e')
                .replace(/4/g, 'a')
                .replace(/5/g, 's')
                .replace(/0/g, 'o');
                
            if (badWords.includes(numberSubstitutions)) {
                return true;
            }
        }
        
        return false;
    }

    generateSeedFromDate(date) {
        const dateHash = (date.getFullYear() * 31 + 
                         date.getMonth() * 12 + 
                         date.getDate()) * 2654435761;
        return Math.abs(dateHash) % 2147483647;
    }

    seededRandom(seed) {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    loadGameState() {
        const savedState = JSON.parse(localStorage.getItem('barkleState') || '{}');
        const today = new Date();
        
        // Always reset if it's a new day
        if (savedState.gameDate !== today.toDateString()) {
            this.clearGameState();
        } else {
            this.score = savedState.score || 0;
            this.attempts = savedState.attempts || [];
            this.gameOver = savedState.gameOver || false;
            this.dailyBreeds = savedState.dailyBreeds || null;
            this.currentBreed = this.dailyBreeds ? this.dailyBreeds[this.attempts.length] : null;
        }
    }
    
    saveGameState() {
        const gameState = {
            gameDate: this.gameDate.toDateString(),
            score: this.score,
            attempts: this.attempts,
            gameOver: this.gameOver,
            currentBreed: this.currentBreed,
            dailyBreeds: this.dailyBreeds  // Save the daily breeds array
        };
        localStorage.setItem('barkleState', JSON.stringify(gameState));
    }

    async initialize() {
        try {
            const response = await fetch('https://dog.ceo/api/breeds/list/all');
            if (!response.ok) {
                throw new Error('api');
            }
            const data = await response.json();
            this.allBreeds = Object.keys(data.message);
            this.dailyBreeds = this.generateDailyBreeds();
            
            // If game is over, show completion modal
            if (this.gameOver) {
                const correctGuesses = this.attempts.filter(attempt => attempt.correct).length;
                const modal = document.getElementById('completion-modal');
                modal.style.display = 'flex';
                
                // Check if yesterday's game has been played
                const yesterdayPlayed = localStorage.getItem('yesterdayPlayed') === 'true';
                
                // Update modal content to include score and option to play yesterday's game (if not played)
                const modalContent = document.querySelector('.modal-content');
                modalContent.innerHTML = `
                    <h2>🐕 All Done for Today! 🐕</h2>
                    <p>Score: ${correctGuesses}/${this.MAX_ATTEMPTS}</p>
                    <p>Come back tomorrow for more Barkle!</p>
                    <div class="button-group">
                        <button id="share-results-btn" class="option-btn">Share Results</button>
                        <button id="view-leaderboard-btn" class="option-btn">View Leaderboard</button>
                        ${!yesterdayPlayed ? '<button id="play-yesterday-btn" class="option-btn">Play Yesterday\'s Game</button>' : ''}
                    </div>
                `;
                
                // Store reference to 'this' for event handlers
                const self = this;
                
                // Set up share button
                const shareBtn = document.getElementById('share-results-btn');
                shareBtn.onclick = function() {
                    self.shareResults();
                };
                
                // Set up play yesterday button if not played
                if (!yesterdayPlayed) {
                    const playYesterdayBtn = document.getElementById('play-yesterday-btn');
                    playYesterdayBtn.onclick = function() {
                        self.playYesterday();
                    };
                }

                // Add the leaderboard button handler
                const leaderboardBtn = document.getElementById('view-leaderboard-btn');
                if (leaderboardBtn) {
                    leaderboardBtn.onclick = function() {
                        window.location.href = 'index.html?showLeaderboard=true';
                    };
                }
            } else {
                // Resume existing game or start new one
                if (this.attempts.length > 0) {
                    // Resume from last attempt
                    await this.resumeGame();
                } else {
                    // If it's a new game, start new round
                    this.newRound();
                }
            }
            
            this.updateStats();
        } catch (error) {
            console.error('Failed to fetch breeds:', error);
            this.showError(this.errorMessages.api);
            return false; // Indicate initialization failed
        }
    }

    updateStats() {
        // Add stats display
        const statsDiv = document.getElementById('stats');
        if (statsDiv) {
            statsDiv.innerHTML = `
                <div class="stats-container">
                    <div>Guesses: ${this.attempts.length}/${this.MAX_ATTEMPTS}</div>
                    <div>Success Rate: ${this.calculateSuccessRate()}%</div>
                    <div>Current Streak: ${this.getCurrentStreak()}</div>
                </div>
            `;
        }
    }

    calculateSuccessRate() {
        const gamesPlayed = parseInt(localStorage.getItem('gamesPlayed') || '0');
        const correctGuesses = this.attempts.filter(attempt => attempt.correct).length;
        const totalGuesses = this.attempts.length;
        
        return totalGuesses ? Math.round((correctGuesses / totalGuesses) * 100) : 0;
    }

    getCurrentStreak() {
        const encodedData = localStorage.getItem('streakData');
        if (!encodedData) return 0;

        try {
            const decodedData = atob(encodedData);
            const [storedStreak, storedChecksum] = decodedData.split(':').map(Number);
            const calculatedChecksum = this.calculateChecksum(storedStreak);

            if (storedChecksum !== calculatedChecksum) {
                console.warn('Streak data may have been tampered with.');
                return 0;
            }

            return storedStreak;
        } catch (error) {
            console.error('Error decoding streak data:', error);
            return 0;
        }
    }

    setCurrentStreak(streak) {
        const checksum = this.calculateChecksum(streak);
        const dataToEncode = `${streak}:${checksum}`;
        const encodedData = btoa(dataToEncode);
        localStorage.setItem('streakData', encodedData);
    }

    calculateChecksum(value) {
        // Simple checksum calculation (e.g., sum of digits)
        return value.toString().split('').reduce((sum, digit) => sum + parseInt(digit, 10), 0);
    }

    async checkAnswer(selected) {
        if (this.gameOver) return;

        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(btn => btn.disabled = true);

        const feedback = document.getElementById('feedback');
        const isToday = this.gameDate.toDateString() === new Date().toDateString();
        
        // Record attempt
        this.attempts.push({
            breed: selected,
            correct: selected === this.currentBreed
        });

        if (selected === this.currentBreed) {
            this.score++;
            document.getElementById('score').textContent = this.score;
            feedback.textContent = 'Correct!';
            feedback.className = 'feedback correct';
            this.happyBark.play();
            
            // Only update streaks for today's game
            if (isToday) {
                localStorage.setItem('gamesWon', 
                    (parseInt(localStorage.getItem('gamesWon') || '0', 10) + 1).toString());
                this.setCurrentStreak(this.getCurrentStreak() + 1);
                this.guessStreak++;
            }
        } else {
            feedback.textContent = `Wrong! It was a ${this.currentBreed}`;
            feedback.className = 'feedback incorrect';
            this.sadBark.play();
            // Only reset streaks for today's game
            if (isToday) {
                this.setCurrentStreak(0);
                this.guessStreak = 0;
            }
        }

        // Check if game is over
        if (this.attempts.length >= this.MAX_ATTEMPTS) {
            this.gameOver = true;
            localStorage.setItem('gamesPlayed',
                (parseInt(localStorage.getItem('gamesPlayed') || '0', 10) + 1).toString());
            
            // Calculate final score
            const correctGuesses = this.attempts.filter(attempt => attempt.correct).length;
            
            // Save score to Firebase BEFORE showing modal
            try {
                await this.saveScore(correctGuesses);
                console.log('Score saved successfully');
            } catch (error) {
                console.error('Failed to save score:', error);
            }
            
            // Show completion modal with score
            const modal = document.getElementById('completion-modal');
            modal.style.display = 'flex';
            
            // Check if yesterday's game has been played
            const yesterdayPlayed = localStorage.getItem('yesterdayPlayed') === 'true';
            
            // Update modal content to include score and option to play yesterday's game (if not played)
            const modalContent = document.querySelector('.modal-content');
            modalContent.innerHTML = `
                <h2>🐕 All Done for Today! 🐕</h2>
                <p>Score: ${correctGuesses}/${this.MAX_ATTEMPTS}</p>
                <p>Come back tomorrow for more Barkle!</p>
                <div class="button-group">
                    <button id="share-results-btn" class="option-btn">Share Results</button>
                    <button id="view-leaderboard-btn" class="option-btn">View Leaderboard</button>
                    ${!yesterdayPlayed ? '<button id="play-yesterday-btn" class="option-btn">Play Yesterday\'s Game</button>' : ''}
                </div>
            `;
            
            // Store reference to 'this' for event handlers
            const self = this;
            
            // Set up share button
            const shareBtn = document.getElementById('share-results-btn');
            shareBtn.onclick = function() {
                self.shareResults();
            };
            
            // Set up play yesterday button if not played
            if (!yesterdayPlayed) {
                const playYesterdayBtn = document.getElementById('play-yesterday-btn');
                playYesterdayBtn.onclick = function() {
                    self.playYesterday();
                };
            }

            // Add the leaderboard button handler
            const leaderboardBtn = document.getElementById('view-leaderboard-btn');
            if (leaderboardBtn) {
                leaderboardBtn.onclick = function() {
                    window.location.href = 'index.html?showLeaderboard=true';
                };
            }
        }

        this.saveGameState();
        this.updateStats();
        this.updateDisplay();

        // Only proceed to next round if not game over
        if (!this.gameOver) {
            setTimeout(() => this.newRound(), 1500);
        }
    }

    updateDisplay() {
        const attemptsDiv = document.getElementById('attempts-history');
        if (attemptsDiv) {
            attemptsDiv.innerHTML = this.attempts.map(attempt => `
                <div class="attempt ${attempt.correct ? 'correct' : 'incorrect'}">
                    ${attempt.breed}
                </div>
            `).join('');
        }
    }

    shareResults() {
        // Calculate number of correct answers
        const correctGuesses = this.attempts.filter(attempt => attempt.correct).length;
        const totalGuesses = this.attempts.length;
        
        // Choose ASCII art based on score
        let dogArt;
        if (correctGuesses >= 4) {
            // Super happy dog for 4-5 correct
            dogArt = `  ∩＿∩
( ˆωˆ )
/    ♥ﾉ
(    )
｜｜Ｊ`;
        } else if (correctGuesses >= 3) {
            // Regular happy dog for 3 correct
            dogArt = `  ∩＿∩
( ´•ω•)
/    ⊂ﾉ
(    )
｜｜Ｊ`;
        } else {
            // Sad dog for 0-2 correct
            dogArt = `  ∩＿∩
( ´•︵•)
/    ⊂ﾉ
(    )
｜｜Ｊ`;
        }

        const attemptsText = this.attempts.map(a => a.correct ? '🟩' : '⬜').join('');
        
        const text = `Barkle (${this.gameDate.toDateString()})\n\n${attemptsText}\n${correctGuesses}/${totalGuesses} correct\n\n${dogArt}\n\nFetch your own pups at https://barkle.netlify.app`;
        
        if (navigator.share) {
            navigator.share({
                text: text
            });
        } else {
            navigator.clipboard.writeText(text);
            alert('Results copied to clipboard!');
        }
    }

    async newRound() {
        try {
            // Get the current breed from our pre-generated daily breeds
            const currentAttempt = this.attempts.length;
            this.currentBreed = this.dailyBreeds[currentAttempt];
            const options = [this.currentBreed];
            
            // Use seeded random for wrong answers
            let wrongSeed = this.todaysSeed + (currentAttempt * 100);
            while (options.length < 4) {
                wrongSeed++;
                const wrongIndex = Math.floor(this.seededRandom(wrongSeed) * this.allBreeds.length);
                const wrong = this.allBreeds[wrongIndex];
                if (!options.includes(wrong)) options.push(wrong);
            }

            // Use seeded shuffle
            options.sort((a, b) => this.seededRandom(wrongSeed + options.length) - 0.5);

            // Get all images for the breed first
            const dogImage = document.getElementById('dog-image');
            dogImage.classList.add('loading');
            
            const allImagesResponse = await fetch(`https://dog.ceo/api/breed/${this.currentBreed}/images`);
            if (!allImagesResponse.ok) {
                throw new Error('image');
            }
            const allImagesData = await allImagesResponse.json();
            const allImages = allImagesData.message;
            
            // Use seeded random to select the same image for all users
            const imageIndex = Math.floor(this.seededRandom(this.todaysSeed + currentAttempt * 1000) * allImages.length);
            const selectedImage = allImages[imageIndex];
            
            // Create new image object to preload
            const img = new Image();
            img.onerror = () => {
                this.showError(this.errorMessages.image);
                dogImage.classList.remove('loading');
            };
            img.onload = () => {
                dogImage.src = selectedImage;
                dogImage.classList.remove('loading');
            };
            img.src = selectedImage;

            // Create buttons
            const buttonsContainer = document.getElementById('buttons');
            buttonsContainer.innerHTML = '';
            options.forEach(breed => {
                const button = document.createElement('button');
                button.textContent = breed.charAt(0).toUpperCase() + breed.slice(1);
                button.className = 'option-btn';
                button.onclick = () => this.checkAnswer(breed);
                buttonsContainer.appendChild(button);
            });

            // Clear feedback
            const feedback = document.getElementById('feedback');
            if (feedback) {
                feedback.textContent = '';
                feedback.className = 'feedback';
            }

        } catch (error) {
            console.error('Failed to start new round:', error);
            this.showError(this.errorMessages[error.message] || this.errorMessages.general);
        }
    }

    async loadSounds() {
        try {
            this.happyBark = new Audio('happy_bark.mp3');
            this.sadBark = new Audio('angry_bark.mp3');
            
            // Silently handle sound loading errors
            this.happyBark.onerror = () => {
                console.error('Failed to load happy bark sound');
                this.happyBark.play = () => {}; // Replace with empty function
            };
            this.sadBark.onerror = () => {
                console.error('Failed to load sad bark sound');
                this.sadBark.play = () => {}; // Replace with empty function
            };
        } catch (error) {
            console.error('Failed to load sounds:', error);
            // Don't show error for sound loading failures
        }
    }

    generateDailyBreeds() {
        // If we already have daily breeds for this date, use them
        if (this.dailyBreeds) {
            return this.dailyBreeds;
        }

        const breeds = new Set();
        const dailyBreeds = [];
        let attempts = 0;
        const maxAttempts = 100;

        while (breeds.size < this.MAX_ATTEMPTS && attempts < maxAttempts) {
            const seed = this.todaysSeed * (breeds.size + 1) * 16807;
            const random = this.seededRandom(seed);
            const index = Math.floor(random * this.allBreeds.length);
            const breed = this.allBreeds[index];
            
            if (!breeds.has(breed)) {
                breeds.add(breed);
                dailyBreeds.push(breed);
            }
            attempts++;
        }
        
        this.dailyBreeds = dailyBreeds;  // Store the generated breeds
        return dailyBreeds;
    }

    playYesterday() {
        // Store today's game state before switching to yesterday's game
        const todayState = {
            barkleState: localStorage.getItem('barkleState'),
            gameDate: new Date().toDateString(),
            played: true
        };
        localStorage.setItem('todayState', JSON.stringify(todayState));
        
        // Clear only the current game state
        localStorage.removeItem('barkleState');
        localStorage.removeItem('gameDate');
        
        // Mark yesterday's game as played (persist this across page reloads)
        localStorage.setItem('yesterdayPlayed', 'true');
        
        // Set the date to yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        this.gameDate = yesterday;
        localStorage.setItem('gameDate', yesterday.toDateString());
        
        // Update seed for yesterday's date
        this.todaysSeed = this.generateSeedFromDate(yesterday);
        
        // Reset game state
        this.score = 0;
        this.attempts = [];
        this.gameOver = false;
        this.dailyBreeds = null;  // Force regeneration of breeds for yesterday
        
        // Generate yesterday's breeds
        this.dailyBreeds = this.generateDailyBreeds();
        
        // Reset game state for yesterday's game
        this.score = 0;
        this.attempts = [];
        this.gameOver = false;
        
        // Save the initial state for yesterday's game
        this.saveGameState();
        
        // Clear localStorage stats for yesterday's game
        localStorage.setItem('gamesPlayed', '0');
        localStorage.setItem('gamesWon', '0');
        // Do not reset streakData here
        localStorage.removeItem('barkleState');
        
        // Hide the completion modal
        const modal = document.getElementById('completion-modal');
        modal.style.display = 'none';
        
        // Clear the attempts history display
        const attemptsDiv = document.getElementById('attempts-history');
        if (attemptsDiv) {
            attemptsDiv.innerHTML = '';
        }
        
        // Reset score display
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = '0';
        }
        
        // Reset stats display
        this.updateStats();
        
        // Update the date display
        const dateElement = document.getElementById('date-display');
        if (dateElement) {
            dateElement.textContent = `Barkle (${yesterday.toDateString()})`;
        }
        
        // Start the game for yesterday
        this.newRound();
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <p>🐕 ${message} 🐕</p>
            </div>
        `;
        document.body.appendChild(errorDiv);
        document.body.classList.add('modal-open');  // Add class to blur background
    }

    closeError() {
        const errorDiv = document.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        document.body.classList.remove('modal-open');  // Remove blur effect
    }

    async saveScore(correctGuesses) {
        try {
            const db = firebase.database();
            const scoresRef = db.ref('scores');
            const today = new Date();
            const isToday = this.gameDate.toDateString() === today.toDateString();
            
            // Calculate final guess streak based on consecutive correct answers
            const consecutiveCorrect = this.attempts
                .slice()
                .reverse()
                .findIndex(attempt => !attempt.correct);
                
            const finalGuessStreak = consecutiveCorrect === -1 ? 
                this.attempts.length : // All answers were correct
                consecutiveCorrect;    // Number of correct answers until first wrong one
                
            const scoreData = {
                score: correctGuesses,
                date: this.gameDate.toDateString(),
                name: this.playerName || 'Anonymous doggy',
                deviceId: this.deviceId,
                guessStreak: finalGuessStreak,  // Store guess streak for all games
                isYesterdayGame: !isToday,      // Flag to indicate if this is yesterday's game
                streak: isToday ? this.streak : 1  // Only include real streak for today's game
            };

            return scoresRef.push(scoreData);
        } catch (error) {
            console.error('Error saving score:', error);
            return Promise.resolve();
        }
    }
    async resumeGame() {
        try {
            // Update the score display
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                scoreElement.textContent = this.score;
            }
            
            // Update attempts history
            this.updateDisplay();
            
            // Get the current attempt number and corresponding breed
            const currentAttempt = this.attempts.length;
            this.currentBreed = this.dailyBreeds[currentAttempt];
            
            // Get all images for the breed
            const dogImage = document.getElementById('dog-image');
            dogImage.classList.add('loading');
            
            const allImagesResponse = await fetch(`https://dog.ceo/api/breed/${this.currentBreed}/images`);
            if (!allImagesResponse.ok) {
                throw new Error('image');
            }
            const allImagesData = await allImagesResponse.json();
            const allImages = allImagesData.message;
            
            // Use seeded random to select the same image for all users
            const imageIndex = Math.floor(this.seededRandom(this.todaysSeed + currentAttempt * 1000) * allImages.length);
            const selectedImage = allImages[imageIndex];
            
            // Load the image
            const img = new Image();
            img.onerror = () => {
                this.showError(this.errorMessages.image);
                dogImage.classList.remove('loading');
            };
            img.onload = () => {
                dogImage.src = selectedImage;
                dogImage.classList.remove('loading');
            };
            img.src = selectedImage;
            
            // Create the options buttons using same seed as before
            const options = [this.currentBreed];
            let wrongSeed = this.todaysSeed + (currentAttempt * 100);
            
            while (options.length < 4) {
                wrongSeed++;
                const wrongIndex = Math.floor(this.seededRandom(wrongSeed) * this.allBreeds.length);
                const wrong = this.allBreeds[wrongIndex];
                if (!options.includes(wrong)) options.push(wrong);
            }
            
            // Use seeded shuffle
            options.sort((a, b) => this.seededRandom(wrongSeed + options.length) - 0.5);
            
            // Create buttons
            const buttonsContainer = document.getElementById('buttons');
            buttonsContainer.innerHTML = '';
            options.forEach(breed => {
                const button = document.createElement('button');
                button.textContent = breed.charAt(0).toUpperCase() + breed.slice(1);
                button.className = 'option-btn';
                button.onclick = () => this.checkAnswer(breed);
                buttonsContainer.appendChild(button);
            });
            
        } catch (error) {
            console.error('Failed to resume game:', error);
            this.showError(this.errorMessages.general);
            return false;
        }
    }

    displayLeaderboard(scores) {
        const leaderboardContent = document.getElementById('leaderboardContent');
        leaderboardContent.inner
    }

    async initializeStreak() {
        try {
            const db = firebase.database();
            const today = new Date();
            
            // Get player's latest score entries for today
            const scoresRef = db.ref('scores')
                .orderByChild('deviceId')
                .equalTo(this.deviceId);
            
            const snapshot = await scoresRef.once('value');
            const scores = snapshot.val() || {};
            const scoreEntries = Object.values(scores);
            
            // Find the most recent score before today
            const lastScore = scoreEntries
                .filter(score => new Date(score.date) < today)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            
            if (!lastScore) {
                // First time playing
                this.streak = 1;
                this.guessStreak = 0;
            } else {
                const lastPlayDate = new Date(lastScore.date);
                
                // Check if the last play was yesterday
                const isConsecutiveDay = 
                    lastPlayDate.getFullYear() === today.getFullYear() &&
                    lastPlayDate.getMonth() === today.getMonth() &&
                    lastPlayDate.getDate() === today.getDate() - 1;
                
                if (isConsecutiveDay) {
                    this.streak = lastScore.streak + 1;
                } else {
                    this.streak = 1;  // Reset streak if not consecutive
                }
                this.guessStreak = 0;  // Always start with 0 guess streak
            }
            
        } catch (error) {
            console.error('Error managing streak:', error);
            this.streak = 1;
            this.guessStreak = 0;
        }
    }

    clearGameState() {
        localStorage.removeItem('barkleState');
        localStorage.removeItem('gameDate');
        // Don't remove yesterdayPlayed here
        this.score = 0;
        this.attempts = [];
        this.gameOver = false;
        this.dailyBreeds = null;
    }
}

// Start the game when page loads
window.onload = () => new BarkleGame(); 