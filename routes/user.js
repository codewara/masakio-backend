const express = require('express');
const router = express.Router();
const db = require('../db');

// Get user profile (with diseases)
router.get('/:id', (req, res) => {
    const { id } = req.params;

    // Get user data
    const userQuery = 'SELECT * FROM user WHERE id_user = ?';
    db.query(userQuery, [id], (err, userResults) => {
        if (err) return res.status(500).json({ error: err.message });

        if (userResults.length === 0) return res.status(404).json({ error: 'User not found' });

        // Get user's disease history
        const diseasesQuery = `
            SELECT p.nama_penyakit
            FROM riwayat_user ru
            JOIN penyakit p ON ru.id_penyakit = p.id_penyakit
            WHERE ru.id_user = ?
        `;
        db.query(diseasesQuery, [id], (err, diseaseResults) => {
            if (err) return res.status(500).json({ error: err.message });

            // Combine user data with their disease history
            const userData = userResults[0];
            userData.diseases = diseaseResults.map(disease => disease.nama_penyakit);

            res.status(200).json(userData);
        });
    });
});

// Update user profile and diseases (PUT request)
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, password, birthDate, diseases } = req.body;  // diseases is an array of disease names

    // Optional: Hash password if it's being updated
    let hashedPassword = password;
    if (password) {
        hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    }

    // Update user data
    const updateQuery = `
        UPDATE user 
        SET 
            nama_user = ?, 
            email = ?, 
            password = ?, 
            tanggal_lahir = ?
        WHERE id_user = ?
    `;
    db.query(updateQuery, [name, email, hashedPassword, birthDate, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // If diseases are provided, update disease history
        if (diseases && diseases.length > 0) {
            diseases.forEach(diseaseName => {
                // Find the disease ID
                db.query('SELECT id_penyakit FROM penyakit WHERE nama_penyakit = ?', [diseaseName], (err, diseaseResults) => {
                    if (err) return res.status(500).json({ error: err.message });

                    if (diseaseResults.length > 0) {
                        const diseaseId = diseaseResults[0].id_penyakit;

                        // Add disease to user's disease history if it doesn't exist already
                        db.query('SELECT * FROM riwayat_user WHERE id_user = ? AND id_penyakit = ?', [userId, diseaseId], (err, results) => {
                            if (err) return res.status(500).json({ error: err.message });

                            if (results.length === 0) {
                                db.query('INSERT INTO riwayat_user (id_user, id_penyakit) VALUES (?, ?)', [userId, diseaseId], (err) => {
                                    if (err) return res.status(500).json({ error: err.message });
                                });
                            }
                        });
                    }
                });
            });
        }

        // Respond with the updated user
        db.query('SELECT * FROM user WHERE id_user = ?', [userId], (err, userResults) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json(userResults[0]);
        });
    });
});

// Remove disease from user's history (DELETE request)
router.delete('/:id/disease/:diseaseId', (req, res) => {
    const { id, diseaseId } = req.params;

    // Delete disease from user's history
    const deleteQuery = 'DELETE FROM riwayat_user WHERE id_user = ? AND id_penyakit = ?';
    db.query(deleteQuery, [id, diseaseId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(200).json({ message: 'Disease removed from history' });
    });
});

module.exports = router;
