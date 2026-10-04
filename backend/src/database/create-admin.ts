import { pool } from "./pool.js";
import { hashPassword } from "../lib/password.js";

const username = process.argv[2];
const password = process.argv[3];
if (!username || !password || password.length < 12)
  throw new Error(
    "Usage: npm run admin:create -- <username> <password-at-least-12-characters>",
  );
await pool.execute(
  `INSERT INTO users (username,password_hash,display_name,role) VALUES (?,?,?,'ADMIN')
  ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),display_name=VALUES(display_name),role='ADMIN',active=TRUE`,
  [username, hashPassword(password), "Administrator"],
);
await pool.end();
console.log(`Administrator ${username} is ready.`);
