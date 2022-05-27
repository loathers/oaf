DROP TABLE reminder;

CREATE TABLE reminders (
  guild_id VARCHAR (30) NOT NULL,
  channel_id VARCHAR (30) NOT NULL,
  message_id VARCHAR (30) NOT NULL,
  message_contents VARCHAR (128) NOT NULL,
  reminder_time bigint NOT NULL,
  PRIMARY KEY (guild_id, channel_id, message_id)
);
