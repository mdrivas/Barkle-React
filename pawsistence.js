class PawsistenceGame {
    constructor() {
        this.errorMessages = {
            general: "Ruh roh! Something went wrong. Let's fetch those dog pics again!",
            network: "Woof! Seems like our dog pics are playing hide and seek. Try again?",
            image: "Paw snap! This puppy picture is being stubborn. Fetching another...",
            api: "Our dog database is taking a nap. Come back later today!"
        };
        
        // Ensure game starts fresh
        this.attempts = [];
        this.gameOver = false;
        this.streak = 0;
        
        // Hide modal on start
        const modal = document.getElementById('game-over-modal');
        if (modal) modal.style.display = 'none';
        
        // Get or prompt for player name
        const storedName = localStorage.getItem('playerName');
        if (!storedName || storedName === 'null' || storedName === 'undefined' || storedName === '') {
            this.promptForName();
        } else {
            this.playerName = storedName;
            // Update display
            const playerNameElement = document.getElementById('player-name');
            if (playerNameElement) {
                playerNameElement.textContent = storedName;
            }
        }
        
        // Get device ID
        this.deviceId = localStorage.getItem('deviceId') || this.generateDeviceId();
        localStorage.setItem('deviceId', this.deviceId);
        
        // Initialize game
        this.loadSounds();
        this.initialize();
        this.loadBestScore();
        
        // Add these properties
        this.maxDailyPlays = 3;
        this.playsToday = 0;
        
        // Load plays count from Firebase on startup
        this.loadDailyPlays();
    }

    generateDeviceId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    loadGameState() {
        this.streak = 0;
        this.attempts = [];
        this.gameOver = false;
        document.getElementById('streak').textContent = this.streak;
    }

    async initialize() {
        try {
            const response = await fetch('https://dog.ceo/api/breeds/list/all');
            if (!response.ok) {
                throw new Error('api');
            }
            const data = await response.json();
            this.allBreeds = Object.keys(data.message);
            this.newRound();
        } catch (error) {
            console.error('Failed to fetch breeds:', error);
            this.showError(this.errorMessages.api);
        }
    }

    async newRound() {
        try {
            // Enable all buttons at the start of a new round
            const buttons = document.querySelectorAll('.option-btn');
            buttons.forEach(btn => btn.disabled = false);

            // Get a random breed
            const randomBreed = this.allBreeds[Math.floor(Math.random() * this.allBreeds.length)];
            this.currentBreed = randomBreed;
            
            // Generate 3 wrong options
            const options = [this.currentBreed];
            while (options.length < 4) {
                const wrongBreed = this.allBreeds[Math.floor(Math.random() * this.allBreeds.length)];
                if (!options.includes(wrongBreed)) {
                    options.push(wrongBreed);
                }
            }

            // Shuffle options
            options.sort(() => Math.random() - 0.5);

            // Get image for current breed
            const dogImage = document.getElementById('dog-image');
            dogImage.classList.add('loading');
            
            const allImagesResponse = await fetch(`https://dog.ceo/api/breed/${this.currentBreed}/images`);
            if (!allImagesResponse.ok) {
                throw new Error('image');
            }
            const allImagesData = await allImagesResponse.json();
            const allImages = allImagesData.message;
            
            // Pick random image
            const selectedImage = allImages[Math.floor(Math.random() * allImages.length)];
            
            // Load image
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

    async checkAnswer(selected) {
        if (this.gameOver) return;

        // Check remaining plays
        if (this.playsToday >= this.maxDailyPlays) {
            // Show the daily limit modal
            const modal = document.getElementById('daily-limit-modal');
            if (modal) {
                modal.style.display = 'flex';
                
                // Set up button handlers
                const shareDailyBtn = modal.querySelector('#share-daily-btn');
                const leaderboardBtn = modal.querySelector('#view-leaderboard-btn');
                const homeBtn = modal.querySelector('#home-btn');
                
                if (shareDailyBtn) {
                    // Remove old listener and create fresh button
                    shareDailyBtn.replaceWith(shareDailyBtn.cloneNode(true));
                    const newShareBtn = modal.querySelector('#share-daily-btn');
                    newShareBtn.onclick = () => this.shareResults(this.streak);
                }
                
                if (leaderboardBtn) {
                    leaderboardBtn.onclick = () => window.location.href = 'index.html?showLeaderboard=true';
                }
                
                if (homeBtn) {
                    homeBtn.onclick = () => window.location.href = 'index.html';
                }
            }
            return;
        }

        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent.toLowerCase() === selected) {
                btn.classList.add(selected === this.currentBreed ? 'correct' : 'incorrect');
            }
        });

        const feedback = document.getElementById('feedback');
        
        // Record attempt
        this.attempts.push({
            breed: selected,
            correct: selected === this.currentBreed
        });

        if (selected === this.currentBreed) {
            this.streak++;
            document.getElementById('streak').textContent = this.streak;
            feedback.textContent = 'Correct!';
            feedback.className = 'feedback correct';
            this.happyBark.play();
            
            // Update high score if needed
            const currentHighScore = parseInt(localStorage.getItem('pawsistenceHighScore') || '0');
            if (this.streak > currentHighScore) {
                localStorage.setItem('pawsistenceHighScore', this.streak.toString());
                document.getElementById('high-score').textContent = this.streak;
            }

            // Continue with new round after delay
            setTimeout(() => this.newRound(), 1500);
        } else {
            feedback.textContent = `Wrong! It was a ${this.currentBreed}`;
            feedback.className = 'feedback incorrect';
            this.sadBark.play();
            this.gameOver = true;

            // Increment plays counter ONCE when game ends
            this.playsToday++;
            
            // Update Firebase with new plays count and save score
            await Promise.all([
                this.updateDailyPlays(),
                this.saveScore()
            ]);

            // Show game over modal
            const modal = document.getElementById('game-over-modal');
            if (modal) {
                const finalStreak = modal.querySelector('#final-streak');
                if (finalStreak) {
                    finalStreak.textContent = this.streak;
                }
                modal.style.display = 'flex';

                // Set up button handlers with proper binding
                const playAgainBtn = modal.querySelector('#play-again-btn');
                const shareBtn = modal.querySelector('#share-results-btn');
                const leaderboardBtn = modal.querySelector('#view-leaderboard-btn');

                if (playAgainBtn) {
                    playAgainBtn.onclick = () => this.resetGame();
                }
                if (shareBtn) {
                    // Remove the event listener if it exists
                    shareBtn.replaceWith(shareBtn.cloneNode(true));
                    // Get the new button reference
                    const newShareBtn = modal.querySelector('#share-results-btn');
                    // Add the new event listener
                    newShareBtn.onclick = () => this.shareResults();
                }
                if (leaderboardBtn) {
                    leaderboardBtn.onclick = () => window.location.href = 'index.html?showLeaderboard=true';
                }
            }
        }

        this.updateDisplay();
    }

    async resetGame() {
        // Check if we've hit the daily limit
        if (this.playsToday >= this.maxDailyPlays) {
            // Hide game over modal
            document.getElementById('game-over-modal').style.display = 'none';
            
            // Show the daily limit modal
            const modal = document.getElementById('daily-limit-modal');
            if (modal) {
                modal.style.display = 'flex';
                
                // Set up button handlers
                const shareDailyBtn = modal.querySelector('#share-daily-btn');
                const leaderboardBtn = modal.querySelector('#view-leaderboard-btn');
                const homeBtn = modal.querySelector('#home-btn');
                
                if (shareDailyBtn) {
                    // Remove old listener and create fresh button
                    shareDailyBtn.replaceWith(shareDailyBtn.cloneNode(true));
                    const newShareBtn = modal.querySelector('#share-daily-btn');
                    newShareBtn.onclick = () => this.shareResults(this.streak);
                }
                
                if (leaderboardBtn) {
                    leaderboardBtn.onclick = () => window.location.href = 'index.html?showLeaderboard=true';
                }
                
                if (homeBtn) {
                    homeBtn.onclick = () => window.location.href = 'index.html';
                }
            }
            return;
        }

        // Only reset if we haven't hit the limit
        this.streak = 0;
        this.attempts = [];
        this.gameOver = false;
        document.getElementById('streak').textContent = '0';
        document.getElementById('game-over-modal').style.display = 'none';
        this.newRound();
    }

    async saveScore() {
        try {
            const db = firebase.database();
            const userRef = db.ref(`pawsistence-users/${this.deviceId}`);
            const today = new Date().toDateString();
            
            // Get current data to check highest streak
            const snapshot = await userRef.once('value');
            const userData = snapshot.val() || {};
            const newHighestStreak = Math.max(this.streak, userData.highestStreak || 0);
            
            const gameData = {
                lastStreak: this.streak,
                lastPlayDate: today,
                playsToday: this.playsToday,
                name: this.playerName || 'Anonymous doggy',
                highestStreak: newHighestStreak,
                lastUpdated: new Date().toISOString()
            };

            await userRef.update(gameData);
            this.updateHighScore(newHighestStreak);
            
        } catch (error) {
            console.error('Error saving game data:', error);
        }
    }

    async shareResults(currentStreak) {
        try {
            const db = firebase.database();
            const userRef = db.ref(`pawsistence-users/${this.deviceId}`);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val() || {};
            
            const highestStreak = userData.highestStreak || 0;
            const dogEmojis = '🐶'.repeat(Math.min(parseInt(highestStreak), 5));
            
            const shareText = `Pawsistence is Key! 🔑
My Highest Streak: ${highestStreak} ${dogEmojis}

Can you beat my streak?
https://barkle.netlify.app`;

            if (navigator.share) {
                await navigator.share({ text: shareText });
            } else {
                await navigator.clipboard.writeText(shareText);
                alert('Results copied to clipboard!');
            }
        } catch (error) {
            console.error('Error sharing results:', error);
            alert('Unable to share results. Please try again.');
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

    loadSounds() {
        try {
            this.happyBark = new Audio('happy_bark.mp3');
            this.sadBark = new Audio('angry_bark.mp3');
            
            this.happyBark.onerror = () => {
                console.error('Failed to load happy bark sound');
                this.happyBark.play = () => {};
            };
            this.sadBark.onerror = () => {
                console.error('Failed to load sad bark sound');
                this.sadBark.play = () => {};
            };
        } catch (error) {
            console.error('Failed to load sounds:', error);
        }
    }

    promptForName() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <h2> Welcome to Pawsistence! 🐕</h2>
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

        const input = modal.querySelector('#player-name');
        const button = modal.querySelector('#save-name');

        const saveName = () => {
            let name = input.value.trim();
            if (name === '') name = 'Anonymous';
            if (this.containsBadWords(name)) {
                alert('Please choose a different name.');
                return;
            }
            this.playerName = name;
            localStorage.setItem('playerName', name);
            modal.remove();
            
            // Update display
            const playerNameElement = document.getElementById('player-name');
            if (playerNameElement) {
                playerNameElement.textContent = name;
            }
        };

        button.onclick = saveName;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') saveName();
        };
    }

    containsBadWords(name) {
        const badWords = ['bitch', 'nig', 'fuck']; // Same bad words as main game
        const lowerCaseName = name.toLowerCase();
        
        const words = lowerCaseName.split(/[\s-_]+/);
        
        for (const word of words) {
            const cleanWord = word.replace(/[^a-z]/g, '');
            if (badWords.includes(cleanWord)) {
                return true;
            }
            
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

    clearGameState() {
        this.streak = 0;
        this.attempts = [];
        this.gameOver = false;
        document.getElementById('streak').textContent = '0';
    }

    showError(message) {
        const feedback = document.getElementById('feedback');
        if (feedback) {
            feedback.textContent = message;
            feedback.className = 'feedback error';
        }
        console.error(message);
    }

    async loadBestScore() {
        try {
            const db = firebase.database();
            const userRef = db.ref(`pawsistence-users/${this.deviceId}`);
            
            const snapshot = await userRef.once('value');
            const userData = snapshot.val() || {};
            
            // Get highest streak from user data and update display
            const bestStreak = userData.highestStreak || 0;
            this.updateHighScore(bestStreak);
            
        } catch (error) {
            console.error('Error loading best score:', error);
            this.updateHighScore(0);
        }
    }

    updateHighScore(score) {
        const highScoreElement = document.getElementById('high-score');
        if (highScoreElement) {
            highScoreElement.textContent = score;
        }
    }

    async loadDailyPlays() {
        try {
            const db = firebase.database();
            const today = new Date().toDateString();
            const userRef = db.ref(`pawsistence-users/${this.deviceId}`);
            
            const snapshot = await userRef.once('value');
            const userData = snapshot.val() || {};
            
            if (userData.lastPlayDate !== today) {
                this.playsToday = 0;
            } else {
                this.playsToday = userData.playsToday || 0;
            }
            
        } catch (error) {
            console.error('Error loading daily plays:', error);
            this.playsToday = 0;
        }
    }

    async updateDailyPlays() {
        try {
            const db = firebase.database();
            const today = new Date().toDateString();
            const userRef = db.ref(`pawsistence-users/${this.deviceId}`);
            
            // Get current data first
            const snapshot = await userRef.once('value');
            const userData = snapshot.val() || {};
            
            // Update only the plays-related fields while preserving other data
            await userRef.update({
                lastPlayDate: today,
                playsToday: this.playsToday,
                lastUpdated: new Date().toISOString(),
                // Preserve the highest streak
                highestStreak: userData.highestStreak || 0,
                name: userData.name || this.playerName || 'Anonymous doggy'
            });
            
        } catch (error) {
            console.error('Error updating daily plays:', error);
        }
    }

    getPlaysToday() {
        return this.playsToday;
    }
}

// Start the game when page loads
window.onload = () => {
    const game = new PawsistenceGame();
}; 