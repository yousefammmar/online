const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER,
      start_datetime TEXT NOT NULL,
      capacity INTEGER DEFAULT 1,
      available_count INTEGER DEFAULT 1,
      FOREIGN KEY(service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      service_id INTEGER,
      slot_id INTEGER,
      status TEXT DEFAULT 'confirmed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(service_id) REFERENCES services(id),
      FOREIGN KEY(slot_id) REFERENCES slots(id)
    );
  `);

  // Check if we need to seed the admin user
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
  if (adminCount === 0) {
    console.log("Seeding default admin user (admin@huawei.com / admin123)...");
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)").run('Admin User', 'admin@huawei.com', hash, 'admin');
  }

  // Check if we need to seed services
  const serviceCount = db.prepare("SELECT COUNT(*) as count FROM services").get().count;
  if (serviceCount === 0) {
    console.log("Seeding default services and slots...");
    const insertService = db.prepare("INSERT INTO services (name, description, duration_minutes) VALUES (?, ?, ?)");
    const res1 = insertService.run('General Consultation', 'A general checkup.', 30);
    const res2 = insertService.run('Specialist Appointment', 'A detailed review.', 60);

    const insertSlot = db.prepare("INSERT INTO slots (service_id, start_datetime, capacity, available_count) VALUES (?, ?, ?, ?)");
    insertSlot.run(res1.lastInsertRowid, '2026-02-24T09:00:00Z', 2, 2); // capacity of 2
    insertSlot.run(res1.lastInsertRowid, '2026-02-24T10:00:00Z', 1, 1);
    insertSlot.run(res2.lastInsertRowid, '2026-02-24T13:00:00Z', 1, 1);
  }
}

initDb();

module.exports = db;
