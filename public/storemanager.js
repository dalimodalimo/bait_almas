document.addEventListener('DOMContentLoaded', function () {
    let isUpdating = false;
    let currentProductCode = null;

    // Initial loading
    fetchProducts();
    fetchProductOptions(); // For image management form

    // Form submission for adding/updating a product
    document.getElementById('add-product-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this); // Envoi des données et des fichiers
        const url = isUpdating ? `/update-product/${currentProductCode}` : '/add-product';

        fetch(url, {
            method: 'POST',
            body: formData // Envoi avec FormData pour inclure l'image
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message || data.error);
            fetchProducts();
            this.reset();
            isUpdating = false;
        })
        .catch(error => console.error('Error:', error));
    });

    // Function to load products
    function fetchProducts() {
        fetch('/products')
            .then(response => response.json())
            .then(data => {
                const tableBody = document.querySelector('#products-table tbody');
                tableBody.innerHTML = '';
                data.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${product.code}</td>
                        <td>${product.name}</td>
                        <td>${product.price}</td>
                        <td>${product.description}</td>
                        <td>${product.quantity}</td>
                        <td><img src="${product.image}" style="width: 50px;"></td>
                        <td>
                            <button onclick="startUpdateProduct('${product.code}')">تحديث</button>
                            <button onclick="deleteProduct('${product.code}')">حذف</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => console.error('Error fetching products:', error));
    }

    // Start updating a product
    window.startUpdateProduct = function (code) {
        fetch(`/product/${code}`)
            .then(response => response.json())
            .then(product => {
                document.getElementById('name').value = product.name;
                document.getElementById('price').value = product.price;
                document.getElementById('description').value = product.description;
                document.getElementById('quantity').value = product.quantity;

                isUpdating = true;
                currentProductCode = product.code;
            })
            .catch(error => console.error('Error fetching product:', error));
    };

    // Delete product
    window.deleteProduct = function (code) {
        if (confirm('هل تريد حقا حذف هذا المنتج؟')) {
            fetch(`/delete-product/${code}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message || data.error);
                fetchProducts();
            })
            .catch(error => console.error('Error deleting product:', error));
        }
    };

    // Image management form submission
    document.getElementById('add-image-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(this);

        fetch('/add-images', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message || data.error);
            this.reset();
        })
        .catch(error => console.error('Error adding images:', error));
    });

    // Load product options in image management form
    function fetchProductOptions() {
        fetch('/products')
            .then(response => response.json())
            .then(data => {
                const productSelect = document.getElementById('product-select');
                productSelect.innerHTML = '<option value="">اختر منتجًا</option>';
                data.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.code;
                    option.textContent = product.name;
                    productSelect.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching product options:', error));
    }

    // Function to handle tab switching
    window.openTab = function (evt, tabName) {
        const tabcontent = document.getElementsByClassName('tabcontent');
        for (let i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = 'none';
        }

        const tablinks = document.getElementsByClassName('tablinks');
        for (let i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(' active', '');
        }

        document.getElementById(tabName).style.display = 'block';
        evt.currentTarget.className += ' active';
    };

    document.getElementById('defaultOpen').click();
});
