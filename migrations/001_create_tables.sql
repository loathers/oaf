CREATE TABLE players (
  username VARCHAR (31) PRIMARY KEY,
  kills INTEGER NOT NULL DEFAULT 0,
  skills SMALLINT NOT NULL DEFAULT 0,
  done_with_skills BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE tracked_instances (
  clan_id VARCHAR (12) NOT NULL,
  raid_id VARCHAR (8) NOT NULL,
  PRIMARY KEY(clan_id, raid_id)
);