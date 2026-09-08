import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "personel"]);
export const attendanceTypeEnum = pgEnum("attendance_type", ["giris", "cikis"]);
export const attendanceMethodEnum = pgEnum("attendance_method", [
  "qr",
  "manuel",
  "otomatik",
  "yuz",
]);
export const leaveTypeEnum = pgEnum("leave_type", [
  "yillik",
  "hastalik",
  "mazeret",
]);
export const leaveStatusEnum = pgEnum("leave_status", [
  "beklemede",
  "onaylandi",
  "reddedildi",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique(),
  username: text("username").unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("personel"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  department: text("department"),
  position: text("position"),
  hireDate: date("hire_date"),
  tcKimlik: text("tc_kimlik"),
  bloodType: text("blood_type"),
  birthDate: date("birth_date"),
  address: text("address"),
  photoUrl: text("photo_url"),
  emergencyContact: text("emergency_contact"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  qrToken: text("qr_token").notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  type: attendanceTypeEnum("type").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  method: attendanceMethodEnum("method").notNull().default("qr"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  type: leaveTypeEnum("type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: leaveStatusEnum("status").notNull().default("beklemede"),
  note: text("note"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const frozenDates = pgTable("frozen_dates", {
  id: uuid("id").defaultRandom().primaryKey(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const doorStations = pgTable("door_stations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().default("Ana Kapı"),
  token: text("token").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const holidays = pgTable("holidays", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  name: text("name").notNull(),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  summary: text("summary").notNull(),
  meta: text("meta"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  attendance: many(attendance),
  leaveRequests: many(leaveRequests),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
  }),
  reviewer: one(users, {
    fields: [leaveRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const frozenDatesRelations = relations(frozenDates, ({ one }) => ({
  creator: one(users, {
    fields: [frozenDates.createdBy],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type FrozenDate = typeof frozenDates.$inferSelect;
export type DoorStation = typeof doorStations.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
