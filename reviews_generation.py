import google.generativeai as genai
import typing_extensions as typing
import os

GOOGLE_KEY = os.getenv("GOOGLE_API_KEY")

system_prompt = """You are a generative AI assistant tasked with generating simulated reviews posted by users for games on Steam.
You will be provided with the name of game and are asked to write a simulated review for this game.

You are expected to write a review that will include:
1. A short (3-10 word) title for the review;
2. The user's rating of the game a single character 'P' or 'N' either positive or negative respectively;
3. Review content which is a paragraph about the user's experience with the game;
4. A date when the review was posted. This will be in UNIX format as time since last epoch, please attempt to make the date reasonable for the game.

A sample review might look like:
Title: DOOM 2016 is a great high action game.
Rating: P.
Content: I greatly enjoyed the time I have spent playing Doom 2016 so far. It has high action fast paced combat which keeps me interested and engaged thoughout the story always allowing more learning as you progress. The combat loop while simplistic in nature allows a great deal of variation and is still fun after many playthroughs. I would highly recomend this game to others interested.
Date posted: 1699043882
"""

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction=system_prompt
)

class Review(typing.TypedDict):
    title: str
    content: str
    rating: str # Expecting single character 'P' or 'N'
    review_date: int # Expecting date in UNIX standard time since last epoch

response = model.generate_content(
    "",
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json", response_schema=list[Review]
    ),
)

print(response)