// models/Inscription.js
const db = require('../config/db');

class Inscription {
  static async create(data) {
    const [result] = await db.execute(`
      INSERT INTO inscriptions (
        full_name, cpf, email, phone, city, state, course, institution, accepted, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      data.fullName,
      data.cpf,
      data.email,
      data.phone,
      data.city,
      data.state,
      data.course,
      data.institution,
      data.accepted ? 1 : 0
    ]);

    return result.insertId;
  }

  static async findAll() {
    const [rows] = await db.execute(`
      SELECT * FROM inscriptions ORDER BY created_at DESC
    `);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute(`
      SELECT * FROM inscriptions WHERE id = ?
    `, [id]);
    return rows[0] || null;
  }

  static async markAsWinner(id, modality, institution) {
    const [result] = await db.execute(`
      UPDATE inscriptions SET is_winner = 1, winner_modality = ?, winner_institution = ?, won_at = NOW()
      WHERE id = ?
    `, [modality, institution, id]);

    return result.affectedRows > 0;
  }

  static async getWinners() {
    const [rows] = await db.execute(`
      SELECT * FROM inscriptions WHERE is_winner = 1 ORDER BY won_at ASC
    `);
    return rows;
  }
}

module.exports = Inscription;