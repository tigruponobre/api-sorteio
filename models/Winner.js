// models/Winner.js
const db = require('../config/db');

class Winner {
  static async create(inscriptionId, modality, institution) {
    const [result] = await db.execute(`
      INSERT INTO winners (inscription_id, modality, institution, created_at)
      VALUES (?, ?, ?, NOW())
    `, [inscriptionId, modality, institution]);

    return result.insertId;
  }

  static async getAll() {
    const [rows] = await db.execute(`
      SELECT w.*, i.full_name, i.email
      FROM winners w
      JOIN inscriptions i ON w.inscription_id = i.id
      ORDER BY w.created_at DESC
    `);
    return rows;
  }
}

module.exports = Winner;