import { pool } from "./pool.js";
import { hashPassword } from "../lib/password.js";

const username = process.argv[2];
const password = process.argv[3];
const validUsername = Boolean(
  username && /^[A-Za-z0-9._-]{3,80}$/.test(username),
);
const strongPassword =
  password &&
  password.length >= 14 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password) &&
  !password.toLocaleLowerCase("en-US").includes(
    (username ?? "").toLocaleLowerCase("en-US"),
  );
if (!validUsername || !username || !strongPassword)
  throw new Error(
    "Use: npm run admin:create -- <username> <password>. The username must be 3-80 letters, numbers, dots, underscores or hyphens. The password must be at least 14 characters with upper/lowercase letters, a number and a symbol, and must not contain the username.",
  );
await pool.execute(
  `INSERT INTO users (username,password_hash,display_name,role) VALUES (?,?,?,'ADMIN')
  ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),display_name=VALUES(display_name),role='ADMIN',active=TRUE`,
  [username, hashPassword(password), "Administrator"],
);
await pool.execute(
  "DELETE s FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE u.username=?",
  [username],
);
await pool.end();
console.log(`Administrator ${username} is ready.`);
