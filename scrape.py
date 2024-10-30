import requests
import time
from collections import deque
import os
from datetime import datetime

API_KEY = os.getenv("STEAM_API_KEY")
STARTING_USER_ID = "76561198279187763"
MAX_USERS = 50  # Limit the number of unique users to process
user_limit_reaced = False

# API endpoints
BASE_URL_USER = f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={API_KEY}&steamids="
BASE_URL_FRIENDS = f"https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key={API_KEY}&steamid="
BASE_URL_OWNED_GAMES = f"https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={API_KEY}&steamid="
BASE_URL_GAME_INFO = "https://store.steampowered.com/api/appdetails?appids="
BASE_URL_GAME_SCHEMA = f"https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key={API_KEY}&appid="
BASE_URL_PLAYER_ACHIEVEMENTS = f"https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key={API_KEY}&steamid="

# BFS setup
queue = deque([STARTING_USER_ID])
visited_users = set()
visited_games = set()
visited_achievements = set()
visited_unlocked_achievements = set()

# Open files for logging SQL statements
storage_directory_path = "./generated_sql"
os.makedirs(storage_directory_path, exist_ok=True)
file_users = open(f"{storage_directory_path}/users.sql", "w")
file_friends = open(f"{storage_directory_path}/friends.sql", "w")
file_games = open(f"{storage_directory_path}/games.sql", "w")
file_games_owned = open(f"{storage_directory_path}/games_owned.sql", "w")
file_achievements = open(f"{storage_directory_path}/achievements.sql", "w")
file_unlocked_achievements = open(f"{storage_directory_path}/unlocked_achievements.sql", "w")

def log_user_data(user):
    file_users.write(f"INSERT INTO user (user_id, username, date_created) VALUES ({user['steamid']}, '{user['personaname']}', {user['timecreated']});\n")

def log_friend_data(user_id, friend):
    file_friends.write(f"INSERT INTO friends VALUES ({user_id}, {friend['steamid']}, {friend['friend_since']});\n")

def log_game_data(game, aux_data):
    file_games.write(f"INSERT INTO game (game_id, game_name, publishers, release_date, genres, price) VALUES ({game['appid']}, '{game['name']}', '{','.join(aux_data['publishers']) if aux_data['publishers'] else ''}', {int(datetime.strptime(aux_data['release_date']['date'], "%d %b, %Y").timestamp())}, '{','.join([genre['description'] for genre in aux_data['genres']]) if aux_data['genres'] else ''}', {aux_data['price_overview']['initial']});\n")

def log_game_owned_data(user_id, game):
    file_games_owned.write(f"INSERT INTO games_owned (user_id, game_id, time_played, date_last_played) VALUES ({user_id}, {game['appid']}, {game['playtime_forever']}, {game['rtime_last_played']});\n")

def log_achievement_data(achievement, game_id, idx):
    file_achievements.write(f"INSERT INTO achievement (achievement_number, game_id, title, description) VALUES ({idx + 1}, {game_id}, '{achievement['displayName']}', '{achievement.get('description', '')}');\n")

def log_unlocked_achievement_data(user_id, achievement, idx, game_id):
    file_unlocked_achievements.write(f"INSERT INTO unlocked_achievements (user_id, achievement_number, game_id, date_unlocked) VALUES ({user_id}, {idx + 1}, {game_id}, {achievement['unlocktime']});\n")

def fetch_user_data(user_id):
    url = f"{BASE_URL_USER}{user_id}"
    response = requests.get(url)
    data = response.json().get("response", {}).get("players", [])
    if data:
        user = data[0]
        log_user_data(user)
    return user

def fetch_friends(user_id):
    url = f"{BASE_URL_FRIENDS}{user_id}&relationship=friend"
    response = requests.get(url)
    friends = response.json().get("friendslist", {}).get("friends", [])
    for friend in friends:
        friend_id = friend["steamid"]
        if friend_id not in visited_users and (not user_limit_reaced or len(visited_users) < MAX_USERS):
            queue.append(friend_id)
            log_friend_data(user_id, friend)
    return friends

def fetch_owned_games(user_id):
    url = f"{BASE_URL_OWNED_GAMES}{user_id}&include_appinfo=true&include_played_free_games=true&format=json"
    response = requests.get(url)
    games = response.json().get("response", {}).get("games", [])
    for game in games:
        if game["appid"] not in visited_games:
            aux_response = f"{BASE_URL_GAME_INFO}{game["appid"]}&cc=ca&l=en"
            auxilary_game_data = aux_response.json().get(game["appid"], {}).get("data", {})
            if auxilary_game_data:
                visited_games.add(game["appid"])
                log_game_data(game, auxilary_game_data)
                log_game_owned_data(user_id, game)
    return games

def fetch_game_achievements(game_id):
    url = f"{BASE_URL_GAME_SCHEMA}{game_id}"
    response = requests.get(url)
    achievements = response.json().get("game", {}).get("availableGameStats", {}).get("achievements", [])
    for idx, achievement in enumerate(achievements):
        if (idx, game_id) not in visited_achievements:
            visited_achievements.add((idx, game_id))
            log_achievement_data(achievement, game_id, idx)
    return achievements

def fetch_player_achievements(user_id, game_id):
    url = f"{BASE_URL_PLAYER_ACHIEVEMENTS}{user_id}&appid={game_id}"
    response = requests.get(url)
    player_achievements = response.json().get("playerstats", {}).get("achievements", [])
    for idx, achievement in enumerate(player_achievements):
        if (user_id, idx, game_id) not in visited_unlocked_achievements and achievement['achieved'] == 1:
            visited_unlocked_achievements.add((user_id, idx, game_id))
            log_unlocked_achievement_data(user_id, achievement, idx, game_id)
    return player_achievements

# Main BFS loop with user limit check
while queue:
    current_user = queue.popleft()
    if current_user in visited_users:
        continue
    visited_users.add(current_user)
    
    if len(visited_users) >= MAX_USERS:
        user_limit_reaced = True

    # Fetch and record user data
    fetch_user_data(current_user)
    
    # Fetch and process owned games
    owned_games = fetch_owned_games(current_user)
    for game in owned_games:
        game_id = game["appid"]
        
        # Fetch game achievements schema if not already processed
        fetch_game_achievements(game_id)
        
        # Fetch player's unlocked achievements for this game
        fetch_player_achievements(current_user, game_id)
    
    # Fetch and process friends, adding them to the BFS queue
    if not user_limit_reaced or len(visited_users) < MAX_USERS:
        fetch_friends(current_user)

# Close all files after logging
file_users.close()
file_friends.close()
file_games.close()
file_games_owned.close()
file_achievements.close()
file_unlocked_achievements.close()

print("Data collection complete. SQL insertion files generated.")
