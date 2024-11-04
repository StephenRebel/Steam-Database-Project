import google.generativeai as genai
import typing_extensions as typing
import sqlite3
import os
import json
import random
import time

connection = sqlite3.connect('./SteamDB.db')
cursor = connection.cursor()

GOOGLE_KEY = os.getenv("GOOGLE_API_KEY")

system_prompt = """You are a generative AI assistant tasked with generating simulated reviews posted by users for games on Steam.
You will be provided with the name of game and are asked to write a simulated review for this game.

You are expected to write a review that will include:
1. A short (3-10 word) title for the review;
2. The user's rating of the game a single character 'P' or 'N' either positive or negative respectively (Pick one or the other 50 percent of the time);
3. Review content which is a paragraph about the user's experience with the game;
4. A date when the review was posted. This will be in UNIX format as time since last epoch, please attempt to make the date reasonable for the game.

A sample review might look like (It does not need to be a positive review everytime):
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
    rating: str # Expecting single character 'P' or 'N'
    content: str
    review_date: int # Expecting date in UNIX standard time since last epoch

cursor.execute("SELECT user_id FROM user")
rows = cursor.fetchall()
users = [row[0] for row in rows]
with open("./generated_sql/reviews.sql", 'w', encoding="utf-8") as sql_file:
    for user_id in users:
        query = """
        SELECT g.game_id, g.game_name 
        FROM game AS g
        JOIN games_owned AS go ON g.game_id = go.game_id
        WHERE go.user_id = ?
    """

        cursor.execute(query, (user_id,))
        games = cursor.fetchall()

        subset_size = int(round(len(games) * 0.03))
        subset_games = random.sample(games, subset_size)

        for game in subset_games:
            retries = 0
            while retries < 3:
                time.sleep(13)
                try:
                    response = response = model.generate_content(
                        f"Please generate a review for the game: '{game[1]}'.",
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json", response_schema=list[Review]
                        ),
                    )

                    review = json.loads(response.text)[0]

                    review_title = review['title'].replace("'", "''")
                    review_content = review['content'].replace("'", "''")

                    sql_str = f"INSERT INTO review (title, posting_user, posted_on_game, content, rating, review_date) VALUES ('{review_title}', {user_id}, {game[0]}, '{review_content}', '{review['rating']}', {review['review_date']});"
                    sql_file.write(sql_str + "\n")

                    break
                except Exception as e:
                    print(e)
                    retries += 1

connection.close()