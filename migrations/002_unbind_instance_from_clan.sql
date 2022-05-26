
ALTER TABLE tracked_instances DROP CONSTRAINT tracked_instances_pkey;
ALTER TABLE tracked_instances DROP COLUMN clan_id;
ALTER TABLE tracked_instances ADD PRIMARY KEY (raid_id);