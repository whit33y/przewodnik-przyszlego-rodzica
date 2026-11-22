CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`diff` text
);
--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `parameter_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`valid_from` text NOT NULL,
	`status` text NOT NULL,
	`label` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`published_at` text,
	`author` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
