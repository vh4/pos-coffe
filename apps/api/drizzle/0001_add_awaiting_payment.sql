DO $$ BEGIN
 ALTER TYPE "order_status" ADD VALUE 'awaiting_payment';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
