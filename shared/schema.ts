import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";







export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  studentId: text("student_id"),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  photoUrl: text("photo_url"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  game: text("game").notNull(),
  gameMode: text("game_mode"),
  logoUrl: text("logo_url"),
  members: jsonb("members").$type<{ name: string; gameName: string; grade: string; department: string; isSubstitute?: boolean }[]>(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  game: text("game").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").default("upcoming"),
  posterUrl: text("poster_url"),
  maxTeams: integer("max_teams").default(16),
  membersPerTeam: integer("members_per_team").default(5),
  maxSubstitutes: integer("max_substitutes").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  teamA: text("team_a").notNull(),
  teamB: text("team_b").notNull(),
  scoreA: integer("score_a").default(0),
  scoreB: integer("score_b").default(0),
  status: text("status").default("scheduled"),
  game: text("game"),
  round: text("round"),
  winner: text("winner"),
  bannerUrl: text("banner_url"),
});

export const liveChat = pgTable("live_chat", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id"),
  userId: text("user_id").notNull(),
  displayName: text("display_name").notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  reactions: jsonb("reactions").$type<Record<string, string[]>>(),
});



export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true });
export const insertChatSchema = createInsertSchema(liveChat).omit({ id: true });



export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type ChatMessage = typeof liveChat.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatSchema>;
