import requests
import time
from collections import deque
import os
from datetime import datetime

API_KEY = os.getenv("STEAM_API_KEY")
STARTING_USER_ID = "76561198279187763"
MAX_USERS = 1  # Limit the number of unique users to process
USERS_ADDED = 1
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

# Open files for logging SQL statements
storage_directory_path = "./generated_sql"
os.makedirs(storage_directory_path, exist_ok=True)
file_users = open(f"{storage_directory_path}/users.sql", "w", encoding="utf-8")
file_friends = open(f"{storage_directory_path}/friends.sql", "w", encoding="utf-8")
file_games = open(f"{storage_directory_path}/games.sql", "w", encoding="utf-8")
file_games_owned = open(f"{storage_directory_path}/games_owned.sql", "w", encoding="utf-8")
file_achievements = open(f"{storage_directory_path}/achievements.sql", "w", encoding="utf-8")
file_unlocked_achievements = open(f"{storage_directory_path}/unlocked_achievements.sql", "w", encoding="utf-8")
file_error = open(f"{storage_directory_path}/errors.err", "w", encoding="utf-8")

# Anytime a string might have bad sql chars like "'" (apostrophee/single quote) must be escaped.
def sanitize_sql_string(value):
    """Escapes single quotes and other common SQL characters for safe insertion in SQLite."""
    if isinstance(value, str):
        # Escape single quotes by doubling them for SQLite
        value = value.replace("'", "''")
        # Optionally escape newlines and carriage returns for readability
        value = value.replace("\n", "\\n").replace("\r", "\\r")
        # Remove NULL characters
        value = value.replace("\0", "")
    return value

def parse_date(date_string):
    formats = ["%d %b, %Y", "%b %Y"]  # Add more formats here if needed
    if not date_string:
        return 0
    for fmt in formats:
        try:
            return int(datetime.strptime(date_string, fmt).timestamp())
        except ValueError:
            pass
    file_error.write(f"Date format for '{date_string}' not recognized\n\n")
    return 0

def log_user_data(user):
    user_id = sanitize_sql_string(user['steamid'])
    username = sanitize_sql_string(user.get('personaname', 'None'))
    date = sanitize_sql_string(user.get('timecreated', 0))

    file_users.write(f"INSERT INTO user (user_id, username, date_created) VALUES ({user_id}, '{username}', {date});\n")

def log_friend_data(user_id, friend):
    user_id = sanitize_sql_string(user_id)
    friend_id = sanitize_sql_string(friend['steamid'])
    date = sanitize_sql_string(friend.get('friend_since', 0))

    file_friends.write(f"INSERT INTO friends (user1, user2, date_friended) VALUES ({user_id}, {friend_id}, {date});\n")

def log_game_data(game, aux_data):
    pub_csv = sanitize_sql_string(",".join(aux_data.get("publishers", "")) if aux_data.get("publishers", "") else "")
    if aux_data.get("release_date", {}).get("coming_soon", True):
        rel_date = 0
    else:
        rel_date = sanitize_sql_string(parse_date(aux_data.get("release_date", {}).get("date", "")))
    gen_csv = sanitize_sql_string(",".join([genre.get("description", "") for genre in aux_data.get("genres", [])]) if aux_data.get("genres", []) else "")
    game_id = sanitize_sql_string(game['appid'])
    game_name = sanitize_sql_string(game.get('name', "None"))
    price = sanitize_sql_string(aux_data.get("price_overview", {}).get("initial", 0))

    file_games.write(f"INSERT INTO game (game_id, game_name, publishers, release_date, genres, price) VALUES ({game_id}, '{game_name}', '{pub_csv}', {rel_date}, '{gen_csv}', {price});\n")

def log_game_owned_data(user_id, game):
    user_id = sanitize_sql_string(user_id)
    game_id = sanitize_sql_string(game['appid'])
    time_played = sanitize_sql_string(game.get('playtime_forever', 0))
    last_play = sanitize_sql_string(game.get('rtime_last_played', 0))

    file_games_owned.write(f"INSERT INTO games_owned (user_id, game_id, time_played, date_last_played) VALUES ({user_id}, {game_id}, {time_played}, {last_play});\n")

def log_achievement_data(achievement, game_id, idx):
    achi_num = sanitize_sql_string(idx + 1)
    game_id = sanitize_sql_string(game_id)
    title = sanitize_sql_string(achievement.get('displayName', "None"))
    desc = sanitize_sql_string(achievement.get('description', ''))

    file_achievements.write(f"INSERT INTO achievement (achievement_number, game_id, title, description) VALUES ({achi_num}, {game_id}, '{title}', '{desc}');\n")

def log_unlocked_achievement_data(user_id, achievement, idx, game_id):
    user_id = sanitize_sql_string(user_id)
    achi_num = sanitize_sql_string(idx + 1)
    game_id = sanitize_sql_string(game_id)
    date = sanitize_sql_string(achievement.get('unlocktime', 0))

    file_unlocked_achievements.write(f"INSERT INTO unlocked_achievements (user_id, achievement_number, game_id, date_unlocked) VALUES ({user_id}, {achi_num}, {game_id}, {date});\n")

def fetch_user_data(user_id):
    url = f"{BASE_URL_USER}{user_id}"
    response = requests.get(url)
    if response:
        data = response.json().get("response", {}).get("players", [])
        if data:
            user = data[0]
            log_user_data(user)
        return user

def fetch_friends(user_id):
    global USERS_ADDED

    url = f"{BASE_URL_FRIENDS}{user_id}&relationship=friend"
    response = requests.get(url)
    if response:
        friends = response.json().get("friendslist", {}).get("friends", [])
        for friend in friends:
            friend_id = friend["steamid"]
            log_friend_data(user_id, friend)
            if friend_id not in visited_users:
                queue.append(friend_id)
                USERS_ADDED += 1
        return friends

# Games seem not being written
def fetch_owned_games(user_id):
    url = f"{BASE_URL_OWNED_GAMES}{user_id}&include_appinfo=true&include_played_free_games=true&format=json"
    response = requests.get(url)
    if response:
        games = response.json().get("response", {}).get("games", [])
        for game in games:
            if game["appid"] not in visited_games:
                aux_url = f"{BASE_URL_GAME_INFO}{str(game['appid'])}&cc=ca&l=en"
                aux_response = requests.get(aux_url)
                if aux_response:
                    auxilary_game_data = aux_response.json().get(str(game["appid"]), {}).get("data", {})
                    if auxilary_game_data:
                        visited_games.add(game["appid"])
                        log_game_data(game, auxilary_game_data)
            log_game_owned_data(user_id, game)
        return games

def fetch_game_achievements(game_id):
    url = f"{BASE_URL_GAME_SCHEMA}{game_id}"
    response = requests.get(url)
    if response:
        achievements = response.json().get("game", {}).get("availableGameStats", {}).get("achievements", [])
        for idx, achievement in enumerate(achievements):
            if (idx, game_id) not in visited_achievements:
                visited_achievements.add((idx, game_id))
                log_achievement_data(achievement, game_id, idx)
        return achievements

def fetch_player_achievements(user_id, game_id):
    url = f"{BASE_URL_PLAYER_ACHIEVEMENTS}{user_id}&appid={game_id}"
    response = requests.get(url)
    if response:
        player_achievements = response.json().get("playerstats", {}).get("achievements", [])
        for idx, achievement in enumerate(player_achievements):
            if achievement['achieved'] == 1:
                log_unlocked_achievement_data(user_id, achievement, idx, game_id)
        return player_achievements

# Main BFS loop with user limit check
while queue:
    current_user = queue.popleft()
    if current_user in visited_users:
        continue
    visited_users.add(current_user)

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
    if not user_limit_reaced:
        fetch_friends(current_user)

    if USERS_ADDED >= MAX_USERS:
        user_limit_reaced = True

    print(USERS_ADDED)

# Close all files after logging
file_users.close()
file_friends.close()
file_games.close()
file_games_owned.close()
file_achievements.close()
file_unlocked_achievements.close()
file_error.close()

print("Data collection complete. SQL insertion files generated.")

# NOTE: Will likely need to drop the date last played field from games to user relation as can only get this for myself.
# NOTE: Potentially rework friend relation ships.
# NOTE: Seem to potentially lose games? Have a lot of games owned that didn't join properly on ids with games, less games than user owns. See if there exist gameids in games_owned without a game in the games table.