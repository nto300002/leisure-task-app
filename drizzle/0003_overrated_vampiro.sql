CREATE TABLE `public_entries` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
