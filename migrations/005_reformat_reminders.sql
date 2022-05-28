DROP TABLE reminders; 
CREATE TABLE reminders (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR (30) NOT NULL,
  channel_id VARCHAR (30) NOT NULL,
  user_id VARCHAR ( 30 ) NOT NULL,
  message_contents VARCHAR (128) NOT NULL,
  reminder_time bigint NOT NULL
);
