CREATE TABLE `session_state` (
	`sid` text PRIMARY KEY NOT NULL,
	`persona_id` text NOT NULL,
	`mode` text NOT NULL,
	`consents` text DEFAULT '[]' NOT NULL,
	`fetch_started_at` text,
	`retries` text DEFAULT '{}' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`overrides` text DEFAULT '[]' NOT NULL,
	`plan` text,
	`updated_at` text NOT NULL
);
