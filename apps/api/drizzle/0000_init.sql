CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"part_number" integer NOT NULL,
	"season" text,
	"number_in_part" integer NOT NULL,
	"official_number" integer NOT NULL,
	"title_fr" text,
	"title_en" text,
	"air_date" date,
	CONSTRAINT "episodes_number_positive" CHECK ("episodes"."number_in_part" > 0 and "episodes"."official_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"number" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "parts_number_positive" CHECK ("parts"."number" > 0)
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"key" text PRIMARY KEY NOT NULL,
	"part_number" integer NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"persistent" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"anti_spoil" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_format" CHECK ("users"."username" ~ '^[a-zA-Z0-9_-]{3,24}$')
);
--> statement-breakpoint
CREATE TABLE "watched_episodes" (
	"user_id" uuid NOT NULL,
	"episode_id" text NOT NULL,
	"watched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watched_episodes_user_id_episode_id_pk" PRIMARY KEY("user_id","episode_id")
);
--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_part_number_parts_number_fk" FOREIGN KEY ("part_number") REFERENCES "public"."parts"("number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_seasons_key_fk" FOREIGN KEY ("season") REFERENCES "public"."seasons"("key") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_part_number_parts_number_fk" FOREIGN KEY ("part_number") REFERENCES "public"."parts"("number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watched_episodes" ADD CONSTRAINT "watched_episodes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watched_episodes" ADD CONSTRAINT "watched_episodes_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_part_number_idx" ON "episodes" USING btree ("part_number","number_in_part");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_part_position_idx" ON "seasons" USING btree ("part_number","position");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_idx" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "watched_episodes_episode_id_idx" ON "watched_episodes" USING btree ("episode_id");