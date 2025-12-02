ALTER TABLE `inventory` MODIFY COLUMN `warehouseLocation` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory` MODIFY COLUMN `batchNumber` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_sku_unique` UNIQUE(`sku`);