ALTER TABLE `invoices` ADD `isArchived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `invoices` ADD `archivedById` int;--> statement-breakpoint
ALTER TABLE `tenders` ADD `isArchived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tenders` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tenders` ADD `archivedById` int;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_archivedById_users_id_fk` FOREIGN KEY (`archivedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenders` ADD CONSTRAINT `tenders_archivedById_users_id_fk` FOREIGN KEY (`archivedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;