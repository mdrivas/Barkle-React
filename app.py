from flask import Flask, jsonify, request, render_template
import requests
from datetime import datetime
import random

app = Flask(__name__)

DOG_API_BASE = "https://dog.ceo/api"

@app.route('/')
def home():
    """Serves the main HTML page for the Dog Trainer application"""
    return render_template('dogtrainer.html')

@app.route('/api/breeds/stats', methods=['GET'])
def get_breed_stats():
    """Get statistics about available dog breeds
    
    This route:
    1. Fetches all breeds from the Dog API
    2. Calculates total number of main breeds
    3. Counts breeds that have sub-breeds
    4. Sums up all sub-breeds
    5. Returns a JSON with statistics and timestamp
    """
    response = requests.get(f"{DOG_API_BASE}/breeds/list/all")
    breeds_data = response.json()
    
    total_breeds = len(breeds_data['message'])  # Count all main breeds
    breeds_with_sub = sum(1 for v in breeds_data['message'].values() if v)  # Count breeds with sub-breeds
    sub_breeds = sum(len(v) for v in breeds_data['message'].values())  # Count total sub-breeds
    
    return jsonify({
        'total_breeds': total_breeds,
        'breeds_with_sub_breeds': breeds_with_sub,
        'total_sub_breeds': sub_breeds,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/breeds/random/difficulty', methods=['GET'])
def get_random_breeds_by_difficulty():
    """Get random breeds grouped by difficulty levels
    
    This route:
    1. Fetches all breeds
    2. Categorizes breeds into difficulty levels:
       - Easy: Breeds with no sub-breeds
       - Medium: Breeds with exactly 1 sub-breed
       - Hard: Breeds with 2+ sub-breeds
    3. Returns 5 random breeds from each difficulty level
    """
    response = requests.get(f"{DOG_API_BASE}/breeds/list/all")
    breeds_data = response.json()['message']
    
    # Categorize breeds by difficulty
    easy = [breed for breed, subs in breeds_data.items() if not subs]
    medium = [breed for breed, subs in breeds_data.items() if len(subs) == 1]
    hard = [breed for breed, subs in breeds_data.items() if len(subs) > 1]
    
    return jsonify({
        'easy': random.sample(easy, min(5, len(easy))),
        'medium': random.sample(medium, min(5, len(medium))),
        'hard': random.sample(hard, min(5, len(hard)))
    })

@app.route('/api/breeds/search', methods=['GET'])
def search_breeds():
    """Search breeds by partial name match
    
    This route:
    1. Takes a query parameter 'q' from the request
    2. Fetches all breeds
    3. Performs case-insensitive partial matching
    4. Returns matching breeds and count
    """
    query = request.args.get('q', '').lower()
    response = requests.get(f"{DOG_API_BASE}/breeds/list/all")
    breeds = response.json()['message']
    
    matches = [breed for breed in breeds.keys() if query in breed.lower()]
    return jsonify({
        'query': query,
        'matches': matches,
        'count': len(matches)
    })

@app.route('/api/breeds/match', methods=['GET'])
def get_breed_match():
    """Get two random dog breeds for a matching game
    
    This route:
    1. Fetches all available breeds
    2. Randomly selects two different breeds
    3. Gets a random image for each breed
    4. Returns the pairs in random order for the matching game
    5. Formats breed names for display (capitalizes, replaces hyphens)
    """
    response = requests.get(f"{DOG_API_BASE}/breeds/list/all")
    breeds_data = response.json()['message']
    
    selected_breeds = random.sample(list(breeds_data.keys()), 2)
    match_data = []
    
    for breed in selected_breeds:
        images_response = requests.get(f"{DOG_API_BASE}/breed/{breed}/images/random")
        image_url = images_response.json()['message']
        
        match_data.append({
            'breed': breed,
            'image_url': image_url,
            'display_name': breed.replace('-', ' ').title()
        })
    
    random.shuffle(match_data)  # Randomize order for the game
    
    return jsonify({
        'pairs': match_data,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/breeds/quiz/generate', methods=['GET'])
def generate_quiz():
    """Generate a quiz with random breeds and images
    
    This route:
    1. Accepts difficulty level and question count parameters
    2. Filters breeds based on difficulty:
       - Easy: No sub-breeds
       - Medium: One sub-breed
       - Hard: Multiple sub-breeds
    3. Uses today's date as a seed for consistent randomization
    4. Generates questions with:
       - One correct breed
       - Three random wrong options
       - Random image for the correct breed
    5. Returns quiz data with consistent ordering
    """
    difficulty = request.args.get('difficulty', 'medium')
    count = int(request.args.get('count', 5))
    
    breeds_response = requests.get(f"{DOG_API_BASE}/breeds/list/all")
    breeds_data = breeds_response.json()['message']
    
    # Filter breeds by difficulty level
    if difficulty == 'easy':
        breeds = [b for b, subs in breeds_data.items() if not subs]
    elif difficulty == 'hard':
        breeds = [b for b, subs in breeds_data.items() if len(subs) > 1]
    else:  # medium
        breeds = [b for b, subs in breeds_data.items() if len(subs) == 1]
    
    # Create seed from today's date for consistent randomization
    today = datetime.now()
    seed = (today.year * 31 + today.month * 12 + today.day) * 2654435761
    random.seed(seed)
    
    selected_breeds = random.sample(breeds, min(count, len(breeds)))
    quiz_questions = []
    
    for breed in selected_breeds:
        images_response = requests.get(f"{DOG_API_BASE}/breed/{breed}/images")
        images = images_response.json()['message']
        
        image_index = random.randint(0, len(images) - 1)
        wrong_options = random.sample([b for b in breeds if b != breed], 3)
        
        quiz_questions.append({
            'breed': breed,
            'image_url': images[image_index],
            'options': sorted([breed] + wrong_options),
            'correct_index': sorted([breed] + wrong_options).index(breed),
            'difficulty': difficulty
        })
    
    return jsonify({
        'questions': quiz_questions,
        'difficulty': difficulty,
        'total_questions': len(quiz_questions),
        'seed': seed,  # Include seed for consistent randomization
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000) 