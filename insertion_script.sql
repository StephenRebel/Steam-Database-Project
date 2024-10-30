PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS game;
DROP TABLE IF EXISTS games_owned;
DROP TABLE IF EXISTS achievement;
DROP TABLE IF EXISTS unlocked_achievements;
DROP TABLE IF EXISTS review;

CREATE TABLE user (
    user_id integer primary key NOT NULL,
    username text NOT NULL,
    date_created integer NOT NULL, --Stored as UNIX date from epoch
);

CREATE TABLE friends (
    user1 integer NOT NULL,
    user2 integer NOT NULL,
    date_friended integer NOT NULL,
    PRIMARY KEY (user1, user2),
    FOREIGN KEY (user1) REFERENCES user(user_id),
    FOREIGN KEY (user2) REFERENCES user(user_id),
    CHECK (user1 <> user2)
);

CREATE TABLE game (
    game_id integer primary key NOT NULL,
    game_name text NOT NULL,
    publishers text NOT NULL, -- comma seperated list
    release_date integer NOT NULL, -- date since last epoch
    genres text NOT NULL, -- comma seperated list
    price integer NOT NULL -- in cents CAD
);

CREATE TABLE games_owned (
    user_id integer NOT NULL,
    game_id integer NOT NULL,
    time_played integer NOT NULL, -- stored as number of minutes
    date_last_played integer NOT NULL, -- date since last epoch
    PRIMARY KEY (user_id, game_id),
    FOREIGN KEY (user_id) REFERENCES user(user_id),
    FOREIGN KEY (game_id) REFERENCES game(game_id)
);

CREATE TABLE achievement (
    achievement_number integer NOT NULL,
    game_id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    PRIMARY KEY (achievement_number, game_id),
    FOREIGN KEY (game_id) REFERENCES game(game_id)
);

CREATE TABLE unlocked_achievements (
    user_id integer NOT NULL,
    achievement_number integer NOT NULL,
    game_id integer NOT NULL,
    date_unlocked integer NOT NULL, -- date since last epoch
    PRIMARY KEY (user_id, achievement_number, game_id),
    FOREIGN KEY (user_id) REFERENCES user(user_id),
    FOREIGN KEY (achievement_number, game_id) REFERENCES achievement(achievement_number, game_id)
);

CREATE TABLE review (
    title text NOT NULL,
    posting_user integer NOT NULL,
    posted_on_game integer NOT NULL,
    content text NOT NULL,
    rating char NOT NULL CHECK (rating IN ('P', 'N')), -- rating positive (P) or negative (N)
    review_date integer NOT NULL, -- time since last epoch
    PRIMARY KEY (title, posting_user, posted_on_game),
    FOREIGN KEY (posting_user) REFERENCES user(user_id),
    FOREIGN KEY (posted_on_game) REFERENCES game(game_id)
);

COMMIT;