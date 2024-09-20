document.addEventListener('DOMContentLoaded', function() {
  // Ouverture de l'onglet par défaut (Gestion des utilisateurs)
  document.getElementById("defaultOpen").click();

  // Fonction pour gérer l'ouverture des onglets
  window.openTab = function(evt, tabName) {
    // Cache tout le contenu des onglets
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }

    // Retire la classe active de tous les onglets
    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Affiche l'onglet actuel et ajoute la classe active au bouton
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
  };

  // Fonction pour naviguer directement vers les pages Cashier, Store Manager, et Client
  window.openPage = function(page) {
    window.location.href = `/${page}`;  // Redirige vers la page correspondant à l'onglet
  };

  // Ajouter l'écouteur d'événement au bouton Logout
  document.getElementById('logout-form').addEventListener('submit', function(e) {
    e.preventDefault();
    fetch('/logout', {
      method: 'POST'
    })
    .then(response => {
      if (response.ok) {
        window.location.href = '/'; // Redirige vers la page de connexion après déconnexion
      } else {
        alert('Erreur lors de la déconnexion.');
      }
    })
    .catch(error => console.error('Erreur lors de la déconnexion:', error));
  });

  // Fonctions pour afficher les utilisateurs, les produits et les ventes
  fetchUsers();
  fetchTopProducts();
  fetchDailySales();

  // Fonction pour récupérer et afficher les utilisateurs
  function fetchUsers() {
    fetch('/users')
      .then(response => response.json())
      .then(data => {
        const userTableBody = document.getElementById('user-list');
        userTableBody.innerHTML = ''; // Clear the table before populating it
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

  // Fonction pour récupérer et afficher les produits les plus vendus
  function fetchTopProducts() {
    fetch('/topProducts')
      .then(response => response.json())
      .then(data => {
        const table = document.getElementById('top-products-table');
        table.innerHTML = ''; // Clear the table before populating it
        data.forEach(product => {
          const row = `<tr><td>${product.product_name}</td><td>${product.total_sold}</td></tr>`;
          table.innerHTML += row;
        });
      })
      .catch(error => console.error('Erreur lors du chargement des produits les plus vendus:', error));
  }

  // Fonction pour récupérer et afficher les ventes journalières
  function fetchDailySales() {
    fetch('/dailySales')
      .then(response => response.json())
      .then(data => {
        const table = document.getElementById('daily-sales-table');
        table.innerHTML = ''; // Clear the table before populating it
        data.forEach(sale => {
          const row = `<tr><td>${sale.date}</td><td>${sale.total_sales}</td></tr>`;
          table.innerHTML += row;
        });
      })
      .catch(error => console.error('Erreur lors du chargement des ventes journalières:', error));
  }

  // Fonction pour supprimer un utilisateur
  window.deleteUser = function(id) {
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
          fetchUsers(); // Rafraîchit la liste des utilisateurs après suppression
        }
      })
      .catch(error => console.error('Erreur lors de la suppression de l\'utilisateur:', error));
    }
  };

  // Fonction pour mettre à jour un utilisateur
  window.updateUser = function(id, username, role) {
    const form = document.getElementById('add-user-form');
    form.username.value = username;
    form.role.value = role;

    // Modifier le comportement du formulaire pour mettre à jour l'utilisateur
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
          fetchUsers(); // Rafraîchit la liste des utilisateurs après mise à jour
          form.addEventListener('submit', handleAddUser); // Remet le formulaire en mode ajout
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
        fetchUsers(); // Rafraîchit la liste des utilisateurs après ajout
      }
    })
    .catch(error => console.error('Erreur lors de l\'ajout de l\'utilisateur:', error));
  }

  // Associer la fonction handleAddUser au formulaire d'ajout d'utilisateur
  document.getElementById('add-user-form').addEventListener('submit', handleAddUser);
});
