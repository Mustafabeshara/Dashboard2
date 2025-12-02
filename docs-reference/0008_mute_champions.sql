CREATE TABLE `document_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`parentFolderId` int,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`lastReminderSent` timestamp,
	`nextReminderDue` timestamp,
	`reminderFrequencyDays` int NOT NULL DEFAULT 7,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `folder_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folderId` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`uploadedById` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `folder_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `required_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`documentName` varchar(255) NOT NULL,
	`description` text,
	`isMandatory` boolean NOT NULL DEFAULT true,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`completedById` int,
	`folderId` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `required_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `document_folders` ADD CONSTRAINT `document_folders_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `folder_documents` ADD CONSTRAINT `folder_documents_folderId_document_folders_id_fk` FOREIGN KEY (`folderId`) REFERENCES `document_folders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `folder_documents` ADD CONSTRAINT `folder_documents_uploadedById_users_id_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `required_documents` ADD CONSTRAINT `required_documents_completedById_users_id_fk` FOREIGN KEY (`completedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `required_documents` ADD CONSTRAINT `required_documents_folderId_document_folders_id_fk` FOREIGN KEY (`folderId`) REFERENCES `document_folders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `required_documents` ADD CONSTRAINT `required_documents_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `document_folders_entity_idx` ON `document_folders` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `document_folders_parent_idx` ON `document_folders` (`parentFolderId`);--> statement-breakpoint
CREATE INDEX `document_reminders_entity_idx` ON `document_reminders` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `document_reminders_next_idx` ON `document_reminders` (`nextReminderDue`,`isActive`);--> statement-breakpoint
CREATE INDEX `folder_documents_folder_idx` ON `folder_documents` (`folderId`);--> statement-breakpoint
CREATE INDEX `folder_documents_uploaded_by_idx` ON `folder_documents` (`uploadedById`);--> statement-breakpoint
CREATE INDEX `required_documents_entity_idx` ON `required_documents` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `required_documents_completed_idx` ON `required_documents` (`isCompleted`);