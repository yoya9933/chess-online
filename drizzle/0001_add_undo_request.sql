ALTER TABLE rooms ADD COLUMN previous_state TEXT;
--> statement-breakpoint
ALTER TABLE rooms ADD COLUMN undo_requested_by TEXT;
