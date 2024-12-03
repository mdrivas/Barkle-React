import tkinter as tk
from tkinter import ttk
import requests
import random
from PIL import Image, ImageTk
from io import BytesIO
import pygame
import time

class Barkle:
    def __init__(self):
        # Initialize pygame for sounds
        pygame.mixer.init()
        self.happy_bark = pygame.mixer.Sound("happy_bark.wav")
        self.sad_bark = pygame.mixer.Sound("sad_bark.wav")
        
        # Create main window
        self.root = tk.Tk()
        self.root.title("Barkle")
        self.root.geometry("600x800")
        
        # Initialize game variables
        self.current_breed = None
        self.all_breeds = self.get_all_breeds()
        
        # Add score tracking
        self.score = 0
        self.score_label = None
        
        # Add feedback label
        self.feedback_label = None
        
        # Create GUI elements
        self.setup_gui()
        
        # Start first round
        self.new_round()
        
    def get_all_breeds(self):
        # Get list of all dog breeds from API
        response = requests.get("https://dog.ceo/api/breeds/list/all")
        breeds = response.json()["message"].keys()
        return list(breeds)
    
    def setup_gui(self):
        # Score label at top
        self.score_label = ttk.Label(self.root, text="Score: 0", font=('Arial', 14))
        self.score_label.pack(pady=10)
        
        # Image display
        self.image_label = tk.Label(self.root)
        self.image_label.pack(pady=20)
        
        # Buttons frame
        self.buttons_frame = ttk.Frame(self.root)
        self.buttons_frame.pack(pady=20)
        
        # Create 4 answer buttons
        self.answer_buttons = []
        for i in range(4):
            btn = tk.Button(self.buttons_frame, 
                          command=lambda x=i: self.check_answer(x),
                          font=('Arial', 12),
                          width=20,
                          relief=tk.RAISED)
            btn.pack(pady=5)
            self.answer_buttons.append(btn)
            
        # Feedback label below buttons
        self.feedback_label = tk.Label(self.root, text="", font=('Arial', 16, 'bold'))
        self.feedback_label.pack(pady=20)
        
    def get_random_dog_image(self, breed):
        # Get random image of specific breed
        response = requests.get(f"https://dog.ceo/api/breed/{breed}/images/random")
        image_url = response.json()["message"]
        
        # Load and resize image
        response = requests.get(image_url)
        img = Image.open(BytesIO(response.content))
        img = img.resize((400, 400), Image.Resampling.LANCZOS)
        return ImageTk.PhotoImage(img)
    
    def new_round(self):
        # Select correct breed and three random incorrect breeds
        self.current_breed = random.choice(self.all_breeds)
        options = [self.current_breed]
        while len(options) < 4:
            wrong_breed = random.choice(self.all_breeds)
            if wrong_breed not in options:
                options.append(wrong_breed)
                
        # Shuffle options
        random.shuffle(options)
        
        # Update buttons with breed names
        for btn, breed in zip(self.answer_buttons, options):
            btn.configure(text=breed.title())
            
        # Display new image
        self.current_image = self.get_random_dog_image(self.current_breed)
        self.image_label.configure(image=self.current_image)
        
    def check_answer(self, button_index):
        selected_breed = self.answer_buttons[button_index]['text'].lower()
        
        if selected_breed == self.current_breed:
            # Correct answer
            self.answer_buttons[button_index].configure(bg='light green')
            self.feedback_label.configure(text="Correct!", fg='green')
            self.happy_bark.play()
            self.score += 1
        else:
            # Wrong answer
            self.answer_buttons[button_index].configure(bg='pink')
            self.feedback_label.configure(
                text=f"Wrong! It was a {self.current_breed.title()}", 
                fg='red'
            )
            self.sad_bark.play()
            
        # Update score
        self.score_label.configure(text=f"Score: {self.score}")
            
        # Disable all buttons temporarily
        for btn in self.answer_buttons:
            btn.configure(state='disabled')
            
        # Wait a moment before next round
        self.root.after(2000, self.next_round)
        
    def next_round(self):
        # Reset button colors and states
        for btn in self.answer_buttons:
            btn.configure(bg='SystemButtonFace', state='normal')
        
        # Clear feedback text
        self.feedback_label.configure(text="")
        
        # Start new round
        self.new_round()
        
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    game = Barkle()
    game.run() 