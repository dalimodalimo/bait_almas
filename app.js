const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer'); // Pour l'upload de fichiers
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
        
        // Serve static files from the 'documentation' folder
app.use('/documentation', express.static(path.join(__dirname, 'documentation')));


        // Créer la table documents si elle n'existe pas déjà
        db.run(`CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            invoice_number TEXT NOT NULL,
            contract TEXT NOT NULL,
            measurement_document TEXT,
            payment_receipt1 TEXT,
            complete_payment_receipt TEXT,
            status TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Erreur lors de la création de la table documents:', err.message);
            }
        });
    }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration pour multer (upload de fichiers)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');  // Dossier où les fichiers sont stockés
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);  // Générer un nom unique pour chaque fichier
    }
});
const upload = multer({ storage });

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
        // Si les identifiants sont incorrects
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
        }

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

app.get('/storemanager', checkAuth('storemanager'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'storemanager.html'));
});

app.get('/cashier', checkAuth('cashier'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cashier.html'));
});

app.get('/client', checkAuth('client'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

/* --- Routes pour gérer les documents dans l'onglet أرشيف المستندات --- */

// Route pour ajouter un document avec upload des fichiers PDF
app.post('/add-document', upload.fields([
    { name: 'contract' },
    { name: 'measurement-document' },
    { name: 'payment-receipt1' },
    { name: 'complete-payment-receipt' }
]), (req, res) => {
    const { 'client-name': clientName, 'phone-number': phoneNumber, 'invoice-number': invoiceNumber, status } = req.body;
    const contract = req.files['contract'][0].path;
    const measurementDocument = req.files['measurement-document'] ? req.files['measurement-document'][0].path : null;
    const paymentReceipt1 = req.files['payment-receipt1'] ? req.files['payment-receipt1'][0].path : null;
    const completePaymentReceipt = req.files['complete-payment-receipt'] ? req.files['complete-payment-receipt'][0].path : null;

    // Insertion dans la base de données
    db.run(`INSERT INTO documents (client_name, phone_number, invoice_number, contract, measurement_document, payment_receipt1, complete_payment_receipt, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [clientName, phoneNumber, invoiceNumber, contract, measurementDocument, paymentReceipt1, completePaymentReceipt, status],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Erreur lors de l\'ajout du document' });
                }
                // Renvoie un message de succès et les détails du document ajouté
                res.json({
                    message: 'Document ajouté avec succès',
                    document: {
                        id: this.lastID,
                        client_name: clientName,
                        phone_number: phoneNumber,
                        invoice_number: invoiceNumber,
                        contract: contract,
                        measurement_document: measurementDocument,
                        payment_receipt1: paymentReceipt1,
                        complete_payment_receipt: completePaymentReceipt,
                        status: status
                    }
                });
            });
});




// Servir les fichiers du répertoire "uploads" en tant que statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Route pour récupérer et afficher tous les documents
app.get('/documents', checkAuth('admin'), (req, res) => {
    db.all('SELECT * FROM documents', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erreur lors du chargement des documents' });
        res.json(rows);
    });
});

// Route pour rechercher des documents par nom, numéro de téléphone ou numéro de facture
app.get('/search-document', checkAuth('admin'), (req, res) => {
    const query = `%${req.query.query}%`;
    db.all('SELECT * FROM documents WHERE client_name LIKE ? OR phone_number LIKE ? OR invoice_number LIKE ?', [query, query, query], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erreur lors de la recherche des documents' });
        res.json(rows);
    });
});

/* --- Fin des routes pour أرشيف المستندات --- */

// Route pour ajouter un produit avec upload d'image
app.post('/add-product', upload.single('image'), [
    body('name').notEmpty().trim().escape(),
    body('price').isFloat({ min: 0 }),
    body('quantity').isInt({ min: 0 }),
    body('description').notEmpty().trim().escape(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, description, quantity } = req.body;
    const image = req.file ? req.file.path : null;  // Récupérer le chemin de l'image

    if (!image) {
        return res.status(400).json({ error: 'L\'image est requise.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get('SELECT MAX(code) AS maxCode FROM products', [], (err, row) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Erreur lors de l\'ajout du produit.' });
            }
            const newCode = row.maxCode ? row.maxCode + 1 : 1;
            db.run('INSERT INTO products (code, name, price, description, quantity, image) VALUES (?, ?, ?, ?, ?, ?)',
                [newCode, name, price, description, quantity, image],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Erreur lors de l\'ajout du produit.' });
                    }
                    db.run('COMMIT');
                    res.json({ message: 'Produit ajouté avec succès' });
                }
            );
        });
    });
});


app.post('/process-sale', (req, res) => {
    const { cart, paymentMethod, amountReceived, clientName, clientPhone } = req.body;
    let totalAmount = 0;
    const invoiceId = `INV-${Date.now()}`; // Générer un ID unique pour la facture
    const saleDate = new Date().toISOString().split('T')[0]; // Date actuelle (format ISO)

    const queries = cart.map(item => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM products WHERE code = ?', [item.code], (err, product) => {
                if (err || !product) return reject('Produit non trouvé');
                if (item.quantity > product.quantity) return reject('الكمية غير متوفرة في المخزون ');

                const newQuantity = product.quantity - item.quantity;
                totalAmount += product.price * item.quantity;

                // Mettre à jour la quantité du produit en stock
                db.run('UPDATE products SET quantity = ? WHERE code = ?', [newQuantity, item.code], (err) => {
                    if (err) return reject(err);

                    // Ajouter l'entrée de la vente dans la table sales
                    db.run(
                        `INSERT INTO sales (product_code, product_name, quantity, total_price, payment_method, sale_date, sale_time, invoice_id) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [item.code, product.name, item.quantity, (product.price * item.quantity), paymentMethod, saleDate, new Date().toLocaleTimeString(), invoiceId],
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
            console.log({
                invoiceId,
                clientName,
                clientPhone,
                totalAmount: totalAmount.toFixed(2),
                amountReceived: amountReceived.toFixed(2),
                change: (amountReceived - totalAmount).toFixed(2),
                paymentMethod,
                saleDate
            });
            

            // Insérer la facture dans `invoices`
            db.run(`INSERT INTO invoices (invoice_id, client_name, client_phone, total_amount, amount_received, change_amount, payment_method, invoice_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [invoiceId, clientName, clientPhone, totalAmount.toFixed(2), amountReceived.toFixed(2), (amountReceived - totalAmount).toFixed(2), paymentMethod, saleDate],
                    function(err) {
                        if (err) {
                            console.error('Erreur lors de l\'enregistrement de la facture:', err.message); // Log de l'erreur
                            return res.status(500).json({ 
                                error: 'Erreur lors de l\'enregistrement de la facture', 
                                details: err.message 
                            });
                            
                        }
                        res.json({ success: true, invoiceId, totalAmount, change: (amountReceived - totalAmount).toFixed(2) });
                    }
            );
        })
        .catch(err => {
            console.error('Erreur lors du traitement de la vente:', err); // Log de l'erreur
            res.status(500).json({ error: 'Erreur lors du traitement de la vente', details: err });
        });
});

// Route pour ajouter un produit avec upload d'image
app.post('/add-product', upload.single('image'), [
    body('name').notEmpty().trim().escape(),
    body('price').isFloat({ min: 0 }),
    body('quantity').isInt({ min: 0 }),
    body('description').notEmpty().trim().escape(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, description, quantity } = req.body;
    const image = req.file ? req.file.path : null;  // Récupérer le chemin de l'image

    if (!image) {
        return res.status(400).json({ error: 'L\'image est requise.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get('SELECT MAX(code) AS maxCode FROM products', [], (err, row) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Erreur lors de l\'ajout du produit.' });
            }
            const newCode = row.maxCode ? row.maxCode + 1 : 1;
            db.run('INSERT INTO products (code, name, price, description, quantity, image) VALUES (?, ?, ?, ?, ?, ?)',
                [newCode, name, price, description, quantity, image],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Erreur lors de l\'ajout du produit.' });
                    }
                    db.run('COMMIT');
                    res.json({ message: 'Produit ajouté avec succès' });
                }
            );
        });
    });
});

// Route pour ajouter un produit avec upload d'image
app.post('/add-product', upload.single('image'), [
    body('name').notEmpty().trim().escape(),
    body('price').isFloat({ min: 0 }),
    body('quantity').isInt({ min: 0 }),
    body('description').notEmpty().trim().escape(),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, description, quantity } = req.body;
    const image = req.file ? req.file.path : null;  // Récupérer le chemin de l'image

    if (!image) {
        return res.status(400).json({ error: 'L\'image est requise.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.get('SELECT MAX(code) AS maxCode FROM products', [], (err, row) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Erreur lors de l\'ajout du produit.' });
            }
            const newCode = row.maxCode ? row.maxCode + 1 : 1;
            db.run('INSERT INTO products (code, name, price, description, quantity, image) VALUES (?, ?, ?, ?, ?, ?)',
                [newCode, name, price, description, quantity, image],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Erreur lors de l\'ajout du produit.' });
                    }
                    db.run('COMMIT');
                    res.json({ message: 'Produit ajouté avec succès' });
                }
            );
        });
    });
});

// Route pour mettre à jour un produit avec ou sans upload d'image
app.post('/update-product/:code', upload.single('image'), [
    body('name').notEmpty().trim().escape(),
    body('price').isFloat({ min: 0 }),
    body('quantity').isInt({ min: 0 }),
    body('description').notEmpty().trim().escape()
], (req, res) => {
    const { code } = req.params;
    const { name, price, description, quantity } = req.body;

    // Récupérer le fichier téléchargé (s'il y en a un)
    const newImagePath = req.file ? req.file.path : null;

    // Rechercher le produit à mettre à jour
    db.get('SELECT image FROM products WHERE code = ?', [code], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        // Si aucune nouvelle image n'est téléchargée, on garde l'image actuelle
        const imagePathToUse = newImagePath || row.image;

        // Mettre à jour le produit avec les nouvelles informations, en conservant l'image si non modifiée
        db.run('UPDATE products SET name = ?, price = ?, description = ?, quantity = ?, image = ? WHERE code = ?',
            [name, price, description, quantity, imagePathToUse, code], 
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
                }
                res.json({ message: 'Produit mis à jour avec succès' });
            }
        );
    });
});


// Route pour supprimer un produit
app.delete('/delete-product/:code', (req, res) => {
    const { code } = req.params;
    db.run('DELETE FROM products WHERE code = ?', [code], function(err) {
        if (err) return handleError(err, res);
        res.json({ message: 'تم حذف المنتج ' });
    });
});

// Route pour ajouter un utilisateur
app.post('/addUser', (req, res) => {
    const { username, password, role } = req.body;
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role], function(err) {
        if (err) return res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'utilisateur' });
        res.json({ message: 'تم إضافة المستخدم ' });
    });
});

// Route pour supprimer un utilisateur
app.post('/deleteUser', (req, res) => {
    const { id } = req.body;
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
        res.json({ message: 'تم حذف المستخدم ' });
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
            res.status(404).json({ error: 'لم يتم العثور على المنتج ' });
        }
    });
});



// Route pour supprimer un document par son ID
app.delete('/delete-document/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM documents WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la suppression du document' });
        }
        res.json({ message: 'تم حذف المستند بنجاح ' });
    });
});
 

// Route pour traiter la commande et vérifier la quantité en stock
app.post('/process-order', (req, res) => {
    const { cart, customerName } = req.body;

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: 'السلة فارغة ' });
    }

    if (!customerName) {
        return res.status(400).json({ error: 'إسم العميل مطلوب ' });
    }

    db.serialize(() => {
        let totalAmount = 0;
        const insufficientStock = [];
        const updateProductPromises = cart.map(item => {
            return new Promise((resolve, reject) => {
                // Vérification de la quantité disponible
                db.get('SELECT quantity FROM products WHERE code = ?', [item.code], (err, product) => {
                    if (err || !product) {
                        return reject('لم يتم العثور على المنتج ');
                    }

                    if (product.quantity < item.quantity) {
                        insufficientStock.push(item.name);
                        return resolve();  // Le stock est insuffisant, on ne fait rien
                    }

                    totalAmount += item.price * item.quantity;

                    // Mise à jour de la quantité dans la base de données
                    const newQuantity = product.quantity - item.quantity;
                    db.run('UPDATE products SET quantity = ? WHERE code = ?', [newQuantity, item.code], (err) => {
                        if (err) return reject('خطأ في تحديث المخزون ');
                        resolve();
                    });
                });
            });
        });

        Promise.all(updateProductPromises)
            .then(() => {
                if (insufficientStock.length > 0) {
                    return res.status(400).json({ error: `المخزون غير كاف لـ : ${insufficientStock.join(', ')}` });
                }

                // Insérer la commande et les produits dans la base de données
                const orderDate = new Date().toISOString();
                db.run('INSERT INTO orders (customer_name, total_price, order_date) VALUES (?, ?, ?)',
                    [customerName, totalAmount, orderDate],
                    function (err) {
                        if (err) {
                            return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la commande.' });
                        }

                        const orderId = this.lastID;

                        // Insérer les produits de la commande
                        const orderInsertPromises = cart.map(item => {
                            return new Promise((resolve, reject) => {
                                db.run('INSERT INTO order_products (order_id, product_code, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
                                    [orderId, item.code, item.name, item.quantity, item.price], (err) => {
                                        if (err) return reject('Erreur lors de l\'insertion des produits de la commande.');
                                        resolve();
                                    });
                            });
                        });

                        Promise.all(orderInsertPromises)
                            .then(() => {
                                res.json({ success: true, message: 'تم إرسال الطلبية ' });
                            })
                            .catch(err => res.status(500).json({ error: err }));
                    });
            })
            .catch(err => res.status(500).json({ error: err }));
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
