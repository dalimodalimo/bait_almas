document.addEventListener('DOMContentLoaded', function () {
    // Ouverture de l'onglet par défaut (ex : "Gestion des utilisateurs")
    document.getElementById("defaultOpen").click();

    // Fonction pour gérer l'ouverture des onglets principaux
    window.openTab = function (evt, tabName) {
        const tabcontent = document.getElementsByClassName("tabcontent");
        for (let i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        const tablinks = document.getElementsByClassName("tablinks");
        for (let i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    };

    // Fonction pour gérer l'ouverture des sous-onglets (ex: أرشيف المستندات)
    window.openSubTab = function (evt, subTabName) {
        const subTabContent = document.getElementsByClassName("sub-tabcontent");
        for (let i = 0; i < subTabContent.length; i++) {
            subTabContent[i].style.display = "none";
        }
        const subTabLinks = document.getElementsByClassName("sub-tablinks");
        for (let i = 0; i < subTabLinks.length; i++) {
            subTabLinks[i].className = subTabLinks[i].className.replace(" active", "");
        }
        document.getElementById(subTabName).style.display = "block";
        evt.currentTarget.className += " active";
    };

    // Ouvrir automatiquement le premier sous-onglet
    document.getElementById("defaultSubOpen").click();

    // Gestion du bouton de déconnexion
    document.getElementById('logout-form').addEventListener('submit', function (e) {
        e.preventDefault();
        fetch('/logout', { method: 'POST' })
            .then(response => {
                if (response.ok) {
                    window.location.href = '/';
                } else {
                    alert('Erreur lors de la déconnexion.');
                }
            })
            .catch(error => console.error('Erreur lors de la déconnexion:', error));
    });

    // Gestion des utilisateurs
    fetchUsers();

    // Fonction pour récupérer et afficher les utilisateurs
    function fetchUsers() {
        fetch('/users')
            .then(response => response.json())
            .then(data => {
                const userTableBody = document.getElementById('user-list');
                userTableBody.innerHTML = '';
                data.forEach(user => {
                    const row = `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.username}</td>
                            <td>${user.role}</td>
                            <td>
                                <button onclick="deleteUser(${user.id})">Supprimer</button>
                                <button onclick="updateUser(${user.id}, '${user.username}', '${user.role}')">Mettre à jour</button>
                            </td>
                        </tr>
                    `;
                    userTableBody.innerHTML += row;
                });
            })
            .catch(error => console.error('Erreur lors du chargement des utilisateurs:', error));
    }

    // Fonction pour supprimer un utilisateur
    window.deleteUser = function (id) {
        if (confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
            fetch('/deleteUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    fetchUsers();
                }
            })
            .catch(error => console.error('Erreur lors de la suppression de l\'utilisateur:', error));
        }
    };

    // Fonction pour mettre à jour un utilisateur
    window.updateUser = function (id, username, role) {
        const form = document.getElementById('add-user-form');
        form.username.value = username;
        form.role.value = role;

        form.removeEventListener('submit', handleAddUser);
        form.addEventListener('submit', function handleUpdateUser(event) {
            event.preventDefault();
            const formData = new FormData(form);
            formData.append('id', id);

            fetch(`/updateUser/${id}`, {
                method: 'POST',
                body: new URLSearchParams(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert('Utilisateur mis à jour avec succès');
                    form.reset();
                    fetchUsers();
                    form.addEventListener('submit', handleAddUser);
                }
            })
            .catch(error => console.error('Erreur lors de la mise à jour de l\'utilisateur:', error));
        });
    };

    // Fonction pour ajouter un utilisateur
    function handleAddUser(event) {
        event.preventDefault();
        const formData = new FormData(document.getElementById('add-user-form'));
        fetch('/addUser', {
            method: 'POST',
            body: new URLSearchParams(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert('Utilisateur ajouté avec succès');
                document.getElementById('add-user-form').reset();
                fetchUsers();
            }
        })
        .catch(error => console.error('Erreur lors de l\'ajout de l\'utilisateur:', error));
    }

    // Lier la fonction d'ajout d'utilisateur
    document.getElementById('add-user-form').addEventListener('submit', handleAddUser);

    /* --- GESTION DES DOCUMENTS (أرشيف المستندات) --- */

    // Fonction pour ajouter un document
    document.getElementById('add-document-form').addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        fetch('/add-document', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Erreur lors de l\'ajout du document : ' + data.error);
            } else {
                alert('Document ajouté avec succès');
                this.reset();
                fetchDocuments();
            }
        })
        .catch(error => console.error('Erreur lors de l\'ajout du document:', error));
    });

    // Fonction pour récupérer et afficher les documents dans le tableau
    function fetchDocuments() {
        fetch('/documents')
            .then(response => response.json())
            .then(data => {
                const documentTableBody = document.getElementById('document-list');
                documentTableBody.innerHTML = '';
                data.forEach(doc => {
                    const row = `
                        <tr>
                            <td>${doc.client_name}</td>
                            <td>${doc.phone_number}</td>
                            <td>${doc.invoice_number}</td>
                            <td><a href="${doc.contract}" target="_blank">Télécharger Contrat</a></td>
                            <td><a href="${doc.measurement_document || '#'}" target="_blank">Télécharger Document de Mesure</a></td>
                            <td><a href="${doc.payment_receipt1 || '#'}" target="_blank">Télécharger Reçu de Paiement</a></td>
                            <td><a href="${doc.complete_payment_receipt || '#'}" target="_blank">Télécharger Reçu de Paiement Complet</a></td>
                            <td>${doc.status}</td>
                        </tr>
                    `;
                    documentTableBody.innerHTML += row;
                });
            })
            .catch(error => console.error('Erreur lors du chargement des documents:', error));
    }

    // Recherche de documents
    document.getElementById('search-document-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const query = document.getElementById('search-query').value;

        fetch(`/search-document?query=${query}`)
            .then(response => response.json())
            .then(data => {
                const documentTableBody = document.getElementById('document-list');
                documentTableBody.innerHTML = '';
                data.forEach(doc => {
                    const row = `
                        <tr>
                            <td>${doc.client_name}</td>
                            <td>${doc.phone_number}</td>
                            <td>${doc.invoice_number}</td>
                            <td><a href="${doc.contract}" target="_blank">Télécharger Contrat</a></td>
                            <td><a href="${doc.measurement_document || '#'}" target="_blank">Télécharger Document de Mesure</a></td>
                            <td><a href="${doc.payment_receipt1 || '#'}" target="_blank">Télécharger Reçu de Paiement</a></td>
                            <td><a href="${doc.complete_payment_receipt || '#'}" target="_blank">Télécharger Reçu de Paiement Complet</a></td>
                            <td>${doc.status}</td>
                        </tr>
                    `;
                    documentTableBody.innerHTML += row;
                });
            })
            .catch(error => console.error('Erreur lors de la recherche des documents:', error));
    });

    // Chargement des documents lors du chargement initial de la page
    fetchDocuments();

    /* --- GESTION DES PRODUITS LES PLUS VENDUS --- */
    fetchTopProducts();
    // Gestion des produits les plus vendus
    function fetchTopProducts() {
        fetch('/topProducts')
            .then(response => response.json())
            .then(data => {
                const table = document.getElementById('top-products-table');
                table.innerHTML = '';
                data.forEach(product => {
                    const row = `<tr><td>${product.product_name}</td><td>${product.total_sold}</td></tr>`;
                    table.innerHTML += row;
                });
                displayTopProductsChart(data); // Afficher le graphique après avoir rempli le tableau
            })
            .catch(error => console.error('Erreur lors du chargement des produits les plus vendus:', error));
    }

    // Fonction pour afficher le graphique des produits les plus vendus
    function displayTopProductsChart(data) {
        const ctx = document.getElementById('topProductsChart').getContext('2d');
        const labels = data.map(product => product.product_name);
        const salesData = data.map(product => product.total_sold);

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'المنتجات الأكثر مبيعًا',
                    data: salesData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            }
        });
    }

    /* --- GESTION DES VENTES JOURNALIÈRES --- */
    fetchDailySales();
    // Gestion des ventes journalières
    function fetchDailySales() {
        fetch('/dailySales')
            .then(response => response.json())
            .then(data => {
                const table = document.getElementById('daily-sales-table');
                table.innerHTML = '';
                data.forEach(sale => {
                    const row = `<tr><td>${sale.date}</td><td>${sale.total_sales}</td></tr>`;
                    table.innerHTML += row;
                });
                displayDailySalesChart(data); // Afficher le graphique après avoir rempli le tableau
            })
            .catch(error => console.error('Erreur lors du chargement des ventes journalières:', error));
    }

    // Fonction pour afficher le graphique des ventes journalières
    function displayDailySalesChart(data) {
        const ctx = document.getElementById('dailySalesChart').getContext('2d');
        const labels = data.map(sale => sale.date);
        const salesData = data.map(sale => sale.total_sales);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'إجمالي المبيعات اليومية',
                    data: salesData,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
});
