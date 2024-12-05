class BarklePreview {
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

    async getNextDaysBreeds(numDays = 7) {
        // Fetch all breeds first
        const response = await fetch('https://dog.ceo/api/breeds/list/all');
        const data = await response.json();
        const allBreeds = Object.keys(data.message);

        const today = new Date();
        const results = [];

        for (let i = 0; i < numDays; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            
            const todaysSeed = this.generateSeedFromDate(date);
            const breeds = [];
            
            // Generate 5 breeds for each day
            for (let breedIndex = 0; breedIndex < 5; breedIndex++) {
                const seed = todaysSeed * (breedIndex + 1) * 16807;
                const random = this.seededRandom(seed);
                const index = Math.floor(random * allBreeds.length);
                breeds.push(allBreeds[index]);
            }

            results.push({
                date: date.toDateString(),
                breeds: breeds
            });
        }

        return results;
    }
}

// Run the preview
const preview = new BarklePreview();
preview.getNextDaysBreeds(7).then(results => {
    results.forEach(day => {
        console.log(`\n${day.date}:`);
        day.breeds.forEach((breed, i) => console.log(`${i + 1}. ${breed}`));
    });
}); 