class BarkleGame {
    constructor() {
        this.MAX_ATTEMPTS = 5;  // Number of guesses allowed per day
        this.attempts = [];     // Track all guesses
        this.gameOver = false;
        this.loadGameState();   // Load saved state for today
        this.loadSounds();
        this.initialize();
        this.todaysSeed = this.generateDailySeed();
        this.dailyBreeds = this.generateDailyBreeds();
    }

    generateDailySeed() {
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        let hash = 0;
        for (let i = 0; i < dateString.length; i++) {
            hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
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
            const data = await response.json();
            this.allBreeds = Object.keys(data.message);
            this.dailyBreeds = this.generateDailyBreeds();
            
            // If game is over, show completion modal
            if (this.gameOver) {
                const correctGuesses = this.attempts.filter(attempt => attempt.correct).length;
                const modal = document.getElementById('completion-modal');
                modal.style.display = 'flex';
                
                // Update modal content to include score
                const modalContent = document.querySelector('.modal-content');
                modalContent.innerHTML = `
                    <h2>🐕 All Done for Today! 🐕</h2>
                    <p>Score: ${correctGuesses}/${this.MAX_ATTEMPTS}</p>
                    <p>Come back tomorrow for more Barkle!</p>
                    <button id="share-results-btn" class="option-btn">Share Results</button>
                `;
                
                // Set up share button
                const shareBtn = document.getElementById('share-results-btn');
                shareBtn.onclick = () => this.shareResults();
            } else if (this.attempts.length === 0) {
                // If it's a new game, start new round
                this.newRound();
            } else {
                // Resume existing game
                this.currentBreed = JSON.parse(localStorage.getItem('barkleState')).currentBreed;
                this.updateDisplay();
            }
            
            this.updateStats();
        } catch (error) {
            console.error('Failed to fetch breeds:', error);
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
            
            // Show completion modal with score
            const modal = document.getElementById('completion-modal');
            modal.style.display = 'flex';
            
            // Update modal content to include score
            const modalContent = document.querySelector('.modal-content');
            modalContent.innerHTML = `
                <h2>🐕 All Done for Today! 🐕</h2>
                <p>Score: ${correctGuesses}/${this.MAX_ATTEMPTS}</p>
                <p>Come back tomorrow for more Barkle!</p>
                <button id="share-results-btn" class="option-btn">Share Results</button>
            `;
            
            // Set up share button
            const shareBtn = document.getElementById('share-results-btn');
            shareBtn.onclick = () => this.shareResults();
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
        let dogArt = correctGuesses >= 3 
            ? `  ∩――∩ 
( ´•ω•)  
/    ⊂ﾉ
(    )
｜｜Ｊ`
            : ` ∩――∩ 
( ´•︵•) 
/    ⊂ﾉ
(    )
｜｜Ｊ`;

        const attemptsText = this.attempts.map(a => a.correct ? '🟩' : '⬜').join('');
        
        const text = `Barkle (${new Date().toDateString()})\n\n${attemptsText}\n${correctGuesses}/${totalGuesses} correct\n\n${dogArt}`;
        
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
            let wrongSeed = this.todaysSeed + (currentAttempt * 100); // Ensure unique wrong answers for each round
            while (options.length < 4) {
                wrongSeed++;
                const wrongIndex = Math.floor(this.seededRandom(wrongSeed) * this.allBreeds.length);
                const wrong = this.allBreeds[wrongIndex];
                if (!options.includes(wrong)) options.push(wrong);
            }

            // Use seeded shuffle
            options.sort((a, b) => this.seededRandom(wrongSeed + options.length) - 0.5);

            // Get random dog image
            const imageResponse = await fetch(`https://dog.ceo/api/breed/${this.currentBreed}/images/random`);
            const imageData = await imageResponse.json();
            document.getElementById('dog-image').src = imageData.message;

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
        }
    }

    async loadSounds() {
        try {
            this.happyBark = new Audio('happy_bark.mov');
            this.sadBark = new Audio('angry_bark.mov');
        } catch (error) {
            console.error('Failed to load sounds:', error);
        }
    }

    generateDailyBreeds() {
        const breeds = [];
        for (let i = 0; i < this.MAX_ATTEMPTS; i++) {
            const index = Math.floor(this.seededRandom(this.todaysSeed + i) * this.allBreeds.length);
            breeds.push(this.allBreeds[index]);
        }
        return breeds;
    }
}

// Start the game when page loads
window.onload = () => new BarkleGame(); 