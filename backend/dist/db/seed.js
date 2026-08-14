"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../lib/db");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    console.log("Seeding database...");
    const defaultPermissions = [
        "manage_users",
        "manage_jobs",
        "manage_insights",
        "manage_settings",
        "manage_homepage_copy",
        "manage_section_toggles",
        "view_chat",
        "send_chat_messages",
        "view_enquiries",
        "export_data",
        "maintenance_mode_toggle",
        "manage_seo_settings",
    ];
    console.log("Seeding permissions...");
    for (const name of defaultPermissions) {
        const existing = await db_1.db.select().from(schema_1.permission).where((0, drizzle_orm_1.eq)(schema_1.permission.name, name));
        if (existing.length === 0) {
            await db_1.db.insert(schema_1.permission).values({ name });
        }
    }
    console.log("Checking for admin user...");
    const users = await db_1.db.select().from(schema_1.adminUser);
    const adminCount = users.length;
    if (adminCount === 0) {
        console.log("Creating default admin user...");
        const fallbackEmail = (process.env.ADMIN_EMAIL || "admin@headhunters.com.au").toLowerCase();
        const fallbackPassword = process.env.ADMIN_PASSWORD || "headhunters2024";
        const passwordHash = await bcryptjs_1.default.hash(fallbackPassword, 10);
        await db_1.db.insert(schema_1.adminUser).values({
            email: fallbackEmail,
            passwordHash,
            name: "Head Hunters Admin",
            role: "SUPER_ADMIN",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log(`Default admin created: ${fallbackEmail}`);
    }
    else {
        console.log("Admin user already exists.");
    }
    console.log("Seeding complete.");
    process.exit(0);
}
main().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
