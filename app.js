const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const { body, validationResult } = require('express-validator'); // Pour validation des données

const app = express();
const port = 5500;

// Initialisation de la base de données SQLite
const db = new sqlite3.Database('datahouse.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration des sessions
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // En production, active secure: true avec HTTPS
}));

// Helper function to handle errors globally
function handleError(err, res, message = 'Internal server error') {
    console.error(err);
    res.status(500).json({ error: message });
}

// Route pour afficher la page de connexion
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Authentification des utilisateurs
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Erreur de base de données' });
        if (!user || user.password !== password) return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });

        req.session.user = { username: user.username, role: user.role };
        res.redirect(`/${user.role}`);  // Redirection vers la page en fonction du rôle
    });
});

// Middleware pour vérifier l'authentification par rôle
function checkAuth(role) {
    return function (req, res, next) {
        if (req.session.user && req.session.user.role === role) {
            return next();
        } else {
            res.redirect('/'); // Redirection vers la page de connexion si non autorisé
        }
    };
}

// Routes pour les pages sécurisées par rôle
app.get('/admin', checkAuth('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Accès direct aux pages sans authentification depuis admin
app.get('/storemanager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'storemanager.html'));
});

app.get('/cashier', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cashier.html'));
});

app.get('/client', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

// Route pour ajouter un produit
app.post('/add-product', [
    body('name').notEmpty().trim().escape(),
    body('price').isFloat({ min: 0 }),
    body('quantity').isInt({ min: 0 }),
    body('description').notEmpty().trim().escape(),
    body('image').notEmpty().trim().escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, description, quantity, image } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get('SELECT MAX(code) AS maxCode FROM products', [], (err, row) => {
            if (err) {
                db.run('ROLLBACK');
                return handleError(err, res);
            }
            const newCode = row.maxCode ? row.maxCode + 1 : 1;
            db.run('INSERT INTO products (code, name, price, description, quantity, image) VALUES (?, ?, ?, ?, ?, ?)',
                [newCode, name, price, description, quantity, image],
                function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return handleError(err, res);
                    }
                    db.run('COMMIT');
                    res.json({ message: 'Produit ajouté avec succès' });
                }
            );
        });
    });
});

// Route pour traiter la vente et enregistrer dans la table sales
app.post('/process-sale', (req, res) => {
    const { cart, paymentMethod, amountReceived } = req.body;
    let totalAmount = 0;
    const invoiceId = `INV-${Date.now()}`; // Générer un ID unique pour la facture
    const saleDate = new Date().toISOString().split('T')[0]; // Date actuelle (format ISO)
    const saleTime = new Date().toLocaleTimeString(); // Heure actuelle

    const queries = cart.map(item => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM products WHERE code = ?', [item.code], (err, product) => {
                if (err || !product) return reject('Produit non trouvé');
                if (item.quantity > product.quantity) return reject('Pas assez de stock');

                const newQuantity = product.quantity - item.quantity;
                totalAmount += product.price * item.quantity;

                // Mettre à jour la quantité du produit en stock
                db.run('UPDATE products SET quantity = ? WHERE code = ?', [newQuantity, item.code], (err) => {
                    if (err) return reject(err);

                    // Ajouter l'entrée de la vente dans la table sales
                    db.run(
                        `INSERT INTO sales (product_code, product_name, quantity, total_price, payment_method, sale_date, sale_time, invoice_id) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [item.code, product.name, item.quantity, (product.price * item.quantity), paymentMethod, saleDate, saleTime, invoiceId],
                        (err) => {
                            if (err) return reject(err);
                            resolve();
                        }
                    );
                });
            });
        });
    });

    Promise.all(queries)
        .then(() => {
            if (amountReceived < totalAmount) {
                return res.status(400).json({ error: 'Montant reçu insuffisant' });
            }
            res.json({ success: true, totalAmount, change: (amountReceived - totalAmount).toFixed(2) });
        })
        .catch(err => {
            res.status(500).json({ error: err });
        });
});

// Route pour mettre à jour un produit
app.post('/update-product/:code', [
    body('name').notEmpty().trim().escape(),
    body('price').isFloat({ min: 0 }),
    body('quantity').isInt({ min: 0 }),
    body('description').notEmpty().trim().escape(),
    body('image').notEmpty().trim().escape()
], (req, res) => {
    const { code } = req.params;
    const { name, price, description, quantity, image } = req.body;

    db.run('UPDATE products SET name = ?, price = ?, description = ?, quantity = ?, image = ? WHERE code = ?',
        [name, price, description, quantity, image, code], 
        function(err) {
            if (err) return handleError(err, res);
            res.json({ message: 'Produit mis à jour avec succès' });
        }
    );
});

// Route pour supprimer un produit
app.delete('/delete-product/:code', (req, res) => {
    const { code } = req.params;
    db.run('DELETE FROM products WHERE code = ?', [code], function(err) {
        if (err) return handleError(err, res);
        res.json({ message: 'Produit supprimé avec succès' });
    });
});

// Route pour ajouter un utilisateur
app.post('/addUser', (req, res) => {
    const { username, password, role } = req.body;
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role], function(err) {
        if (err) return res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'utilisateur' });
        res.json({ message: 'Utilisateur ajouté avec succès' });
    });
});

// Route pour supprimer un utilisateur
app.post('/deleteUser', (req, res) => {
    const { id } = req.body;
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
        res.json({ message: 'Utilisateur supprimé avec succès' });
    });
});

// Route pour récupérer tous les utilisateurs
app.get('/users', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
        res.json(rows); // Renvoie les utilisateurs en format JSON
    });
});

// Renvoyer les produits les plus vendus
app.get('/topProducts', (req, res) => {
    db.all(`SELECT product_name, SUM(quantity) AS total_sold FROM sales GROUP BY product_name ORDER BY total_sold DESC LIMIT 10`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erreur lors du chargement des produits' });
        res.json(rows);
    });
});

// Renvoyer les ventes journalières
app.get('/dailySales', (req, res) => {
    db.all(`SELECT sale_date AS date, SUM(total_price) AS total_sales FROM sales GROUP BY sale_date ORDER BY sale_date DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erreur lors du chargement des ventes journalières' });
        res.json(rows);
    });
});

// Route pour récupérer tous les produits
app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return handleError(err, res);
        res.json(rows);
    });
});

// Route pour récupérer un produit par son code
app.get('/product/:code', (req, res) => {
    const { code } = req.params;
    db.get('SELECT * FROM products WHERE code = ?', [code], (err, row) => {
        if (err) return handleError(err, res);
        if (row) {
            res.json(row);
        } else {
            res.status(404).json({ error: 'Produit non trouvé' });
        }
    });
});



// Route pour ajouter des images de produits
app.post('/add-images', (req, res) => {
    const { 'product-name': productName } = req.body;
    const mainImage = req.files['main-image'][0];
    const image1 = req.files['image-1'] ? req.files['image-1'][0] : null;
    const image2 = req.files['image-2'] ? req.files['image-2'][0] : null;
    const image3 = req.files['image-3'] ? req.files['image-3'][0] : null;
    const image4 = req.files['image-4'] ? req.files['image-4'][0] : null;

    db.run(`
        INSERT INTO images (product_name, image_principale, image_1, image_2, image_3, image_4) 
        VALUES (?, ?, ?, ?, ?, ?)
    `, [productName, mainImage.path, image1?.path, image2?.path, image3?.path, image4?.path], function (err) {
        if (err) return res.status(500).json({ error: 'Erreur lors de l\'ajout des images' });
        res.json({ message: 'Images ajoutées avec succès' });
    });
});


// Route pour ajouter des images à un produit
app.post('/add-images', (req, res) => {
    const { product_code, product_name, image_principale, image_1, image_2, image_3, image_4 } = req.body;

    db.run(`INSERT INTO images (product_code, product_name, image_principale, image_1, image_2, image_3, image_4)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [product_code, product_name, image_principale, image_1, image_2, image_3, image_4],
            function(err) {
                if (err) return res.status(500).json({ error: 'Erreur lors de l\'ajout des images.' });
                res.json({ message: 'Images ajoutées avec succès' });
            });
});


// Route pour gérer la déconnexion
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return handleError(err, res, 'Échec de la déconnexion');
        res.redirect('/');
    });
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
