document.addEventListener('DOMContentLoaded', function () {
    // Fetch and display the product catalog
    fetch('/products')
        .then(response => response.json())
        .then(data => {
            const catalog = document.getElementById('product-catalog');
            data.forEach(product => {
                const card = document.createElement('div');
                card.classList.add('card');

                card.innerHTML = `
                    <div class="card-inner">
                        <div class="card-front">
                            <img src="${product.image}" alt="${product.name}" style="width: 100px;">
                            <h3>${product.name}</h3>
                        </div>
                        <div class="card-back">
                            <p>${product.description}</p>
                            <p>Price: $${product.price.toFixed(2)}</p>
                            <button onclick="addToCart('${product.code}')">Add to Cart</button>
                        </div>
                    </div>
                `;
                catalog.appendChild(card);
            });
        })
        .catch(error => console.error('Error fetching products:', error));

    // Function to add a product to the cart
    window.addToCart = function (code) {
        fetch('/product/' + code)
            .then(response => response.json())
            .then(product => {
                if (product.error) {
                    alert(product.error);
                    return;
                }

                const cartItemsList = document.getElementById('cart-items');
                const existingItem = Array.from(cartItemsList.children).find(item => item.dataset.code === product.code);

                if (existingItem) {
                    const quantityElement = existingItem.querySelector('.item-quantity');
                    const newQuantity = parseInt(quantityElement.textContent) + 1;

                    if (newQuantity > product.quantity) {
                        alert('Not enough stock available.');
                        return;
                    }

                    quantityElement.textContent = newQuantity;
                } else {
                    const listItem = document.createElement('li');
                    listItem.dataset.code = product.code;
                    listItem.innerHTML = `
                        ${product.name} - $${product.price.toFixed(2)} 
                        <span class="item-quantity">1</span> 
                        <button onclick="adjustQuantity('${product.code}', 1)">+</button>
                        <button onclick="adjustQuantity('${product.code}', -1)">-</button>
                        <button onclick="removeFromCart('${product.code}')">Remove</button>
                    `;
                    cartItemsList.appendChild(listItem);
                }
                updateCartTotal();
            })
            .catch(error => console.error('Error adding product to cart:', error));
    };

    // Function to update the total cost of the cart
    function updateCartTotal() {
        const cartItemsList = document.getElementById('cart-items');
        let total = 0;
        Array.from(cartItemsList.children).forEach(item => {
            const productCode = item.dataset.code;
            const quantity = parseInt(item.querySelector('.item-quantity').textContent);
            fetch(`/product/${productCode}`)
                .then(response => response.json())
                .then(product => {
                    total += product.price * quantity;
                    document.getElementById('floating-cart').querySelector('h3').textContent = `Total: $${total.toFixed(2)}`;
                })
                .catch(error => console.error('Error fetching product price:', error));
        });
    }

    // Function to adjust the quantity of an item in the cart
    window.adjustQuantity = function (code, delta) {
        const cartItemsList = document.getElementById('cart-items');
        const item = Array.from(cartItemsList.children).find(item => item.dataset.code === code);

        if (item) {
            const quantityElement = item.querySelector('.item-quantity');
            const newQuantity = parseInt(quantityElement.textContent) + delta;

            fetch(`/product/${code}`)
                .then(response => response.json())
                .then(product => {
                    if (newQuantity <= 0) {
                        removeFromCart(code); // Remove the item if the quantity becomes zero
                    } else if (newQuantity > product.quantity) {
                        alert('Not enough stock available.');
                    } else {
                        quantityElement.textContent = newQuantity;
                        updateCartTotal();
                    }
                })
                .catch(error => console.error('Error adjusting quantity:', error));
        }
    };

    // Function to remove a product from the cart
    window.removeFromCart = function (code) {
        const cartItemsList = document.getElementById('cart-items');
        const item = Array.from(cartItemsList.children).find(item => item.dataset.code === code);

        if (item) {
            item.remove();
            updateCartTotal(); // Update the total cost after removal
        }
    };

    // Function to handle the checkout process
    window.checkout = function () {
        const cartItemsList = document.getElementById('cart-items');
        if (cartItemsList.children.length === 0) {
            alert('Your cart is empty.');
            return;
        }

        const cart = Array.from(cartItemsList.children).map(item => ({
            code: item.dataset.code,
            quantity: parseInt(item.querySelector('.item-quantity').textContent)
        }));

        fetch('/process-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cart })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Order placed successfully!');
                    cartItemsList.innerHTML = ''; // Clear the cart
                    document.getElementById('floating-cart').querySelector('h3').textContent = 'Cart';
                } else {
                    alert(data.error);
                }
            })
            .catch(error => console.error('Error processing order:', error));
    };
});
