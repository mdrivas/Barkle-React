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
        this.todaysSeed = this.generateDailySeed();
        this.loadGameState();   // Load saved state for today
        this.loadSounds();
        this.initialize();
        this.gameDate = new Date();  // Initialize with today's date
        
        // Get player name from localStorage or prompt for it
        this.playerName = localStorage.getItem('playerName');
        if (!this.playerName) {
            this.promptForName();
        }
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
                       maxlength="20" 
                       placeholder="Your name"
                       class="name-input"
                       value="${this.playerName || ''}">  <!-- Pre-fill if exists -->
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
            this.playerName = name;  // Store in class
            localStorage.setItem('playerName', name);  // Store in localStorage
            modal.remove();
        };

        button.onclick = saveName;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') saveName();
        };
    }

    generateDailySeed() {
        const today = new Date();
        const dateHash = (today.getFullYear() * 31 + 
                         today.getMonth() * 12 + 
                         today.getDate()) * 2654435761;
        return Math.abs(dateHash) % 2147483647;
    }

    seededRandom(seed) {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    loadGameState() {
        const today = new Date().toDateString();
        const savedState = JSON.parse(localStorage.getItem('barkleState') || '{}');
        
        // Reset if it's a new day
        if (savedState.lastPlayed !== today) {
            this.score = 0;
            this.attempts = [];
            this.gameOver = false;
        } else {
            this.score = savedState.score || 0;
            this.attempts = savedState.attempts || [];
            this.gameOver = savedState.gameOver || false;
        }
    }

    saveGameState() {
        const gameState = {
            lastPlayed: new Date().toDateString(),
            score: this.score,
            attempts: this.attempts,
            gameOver: this.gameOver,
            currentBreed: this.currentBreed
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
        return parseInt(localStorage.getItem('currentStreak') || '0');
    }

    async checkAnswer(selected) {
        if (this.gameOver) return;

        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(btn => btn.disabled = true);

        const feedback = document.getElementById('feedback');
        
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
            
            localStorage.setItem('gamesWon', 
                (parseInt(localStorage.getItem('gamesWon') || '0') + 1).toString());
            localStorage.setItem('currentStreak',
                (parseInt(localStorage.getItem('currentStreak') || '0') + 1).toString());
        } else {
            feedback.textContent = `Wrong! It was a ${this.currentBreed}`;
            feedback.className = 'feedback incorrect';
            this.sadBark.play();
            localStorage.setItem('currentStreak', '0');
        }

        // Check if game is over
        if (this.attempts.length >= this.MAX_ATTEMPTS) {
            this.gameOver = true;
            localStorage.setItem('gamesPlayed',
                (parseInt(localStorage.getItem('gamesPlayed') || '0') + 1).toString());
            
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

            // Get random dog image with loading state
            const dogImage = document.getElementById('dog-image');
            dogImage.classList.add('loading');
            
            const imageResponse = await fetch(`https://dog.ceo/api/breed/${this.currentBreed}/images/random`);
            if (!imageResponse.ok) {
                throw new Error('image');
            }
            const imageData = await imageResponse.json();
            
            // Create new image object to preload
            const img = new Image();
            img.onerror = () => {
                this.showError(this.errorMessages.image);
                dogImage.classList.remove('loading');
            };
            img.onload = () => {
                dogImage.src = imageData.message;
                dogImage.classList.remove('loading');
            };
            img.src = imageData.message;

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
        
        return dailyBreeds;
    }

    playYesterday() {
        // Mark yesterday's game as played
        localStorage.setItem('yesterdayPlayed', 'true');
        
        // Set the date to yesterday and store it
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        this.gameDate = yesterday;  // Store yesterday's date
        
        // Generate yesterday's seed
        const dateHash = (yesterday.getFullYear() * 31 + 
                         yesterday.getMonth() * 12 + 
                         yesterday.getDate()) * 2654435761;
        this.todaysSeed = Math.abs(dateHash) % 2147483647;
        
        // Generate yesterday's breeds
        this.dailyBreeds = this.generateDailyBreeds();
        
        // Reset game state for yesterday's game
        this.score = 0;
        this.attempts = [];
        this.gameOver = false;
        
        // Clear localStorage stats for yesterday's game
        localStorage.setItem('gamesPlayed', '0');
        localStorage.setItem('gamesWon', '0');
        localStorage.setItem('currentStreak', '0');
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

    saveScore(correctGuesses) {
        const db = firebase.database();
        
        return db.ref('scores').push({
            score: correctGuesses,
            date: this.gameDate.toDateString(),  // Use the game's date instead of today
            name: this.playerName || 'Anonymous doggy',
            timestamp: Date.now()
        });
    }
}

// Start the game when page loads
window.onload = () => new BarkleGame(); 