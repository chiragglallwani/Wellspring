import * as z from "zod";

export type Page =
  | "programs"
  | "sessions"
  | "media"
  | "bulk-uploads"
  | "audit"
  | "login";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
    "Password must contain at least one letter, one number, and one special character",
  );

export const registerSchema = z.object({
  tenant_name: z.string().min(1, "Tenant name is required"),
  email: z.string().email("Invalid email address"),
  password: passwordPolicy,
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ForgotPasswordEmailValues = z.infer<typeof forgotPasswordEmailSchema>;

export const forgotPasswordOtpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export type ForgotPasswordOtpValues = z.infer<typeof forgotPasswordOtpSchema>;

export const forgotPasswordNewPasswordSchema = z
  .object({
    password: passwordPolicy,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ForgotPasswordNewPasswordValues = z.infer<
  typeof forgotPasswordNewPasswordSchema
>;

/** User profile held in Redux after login or session restore (no tokens). */
export interface StoredAuthProfile {
  name: string;
  email: string;
  tenantName: string;
}

export interface User {
  name: string;
  email: string;
  tenantName?: string;
}

export interface Program {
  id: string;
  title: string;
  category: string;
  status: "LIVE" | "DRAFT";
  dateCreated: string;
  sessionsCount: number;
}

export const programFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  description: z.string().trim().min(1, "Description is required").max(5000),
  length: z
    .number({ message: "Length is required" })
    .int()
    .min(1, "Length must be at least 1")
    .max(9999),
  isActive: z.boolean(),
});

export type ProgramFormValues = z.infer<typeof programFormSchema>;

export interface Session {
  id: string;
  index: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
}

export const sessionFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  type: z.enum(["audio", "video"], {
    message: "Select audio or video",
  }),
  duration: z
    .number({ message: "Duration is required" })
    .int()
    .min(1, "Duration must be at least 1 second"),
  instructor_name: z.string().trim().min(1, "Instructor name is required"),
  client_key: z.string().trim().max(255).optional(),
  tags: z.string().trim().max(500).optional(),
  media_file_path: z
    .string()
    .trim()
    .min(1, "Upload a media file before saving"),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

export const sessionEditFormSchema = sessionFormSchema.omit({
  media_file_path: true,
});

export type SessionEditFormValues = z.infer<typeof sessionEditFormSchema>;

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: {
    name: string;
    email: string;
    initials: string;
  };
  action: string;
  actionType: string;
  ipAddress: string;
  status: "Success" | "Failed Attempt";
  details?: string;
}
