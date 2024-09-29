document.addEventListener('DOMContentLoaded', function () {
    let cart = []; // Le panier des produits sélectionnés

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
                if (product.error || product.quantity <= 0) {
                    alert('This product is out of stock.');
                    return;
                }

                const existingItem = cart.find(item => item.code === product.code);

                if (existingItem) {
                    if (existingItem.quantity + 1 > product.quantity) {
                        alert('Not enough stock available.');
                        return;
                    }
                    existingItem.quantity += 1; // Increment the quantity
                } else {
                    cart.push({
                        code: product.code,
                        name: product.name,
                        price: product.price,
                        quantity: 1 // Initial quantity set to 1 when adding to the cart
                    });
                }
                updateCartDisplay();
            })
            .catch(error => console.error('Error adding product to cart:', error));
    };

    // Function to update the cart display and the total cost
    function updateCartDisplay() {
        const cartItemsList = document.getElementById('cart-items');
        cartItemsList.innerHTML = ''; // Clear the list before updating
        let total = 0;

        cart.forEach(item => {
            const listItem = document.createElement('li');
            listItem.dataset.code = item.code; // Attach the product code to the list item
            listItem.innerHTML = `
                ${item.name} - $${item.price.toFixed(2)} 
                <span class="item-quantity">Quantity: ${item.quantity}</span>
                <button class="remove-button" data-code="${item.code}">Remove</button>
            `;
            cartItemsList.appendChild(listItem);
            total += item.price * item.quantity;
        });

        document.getElementById('floating-cart').querySelector('h3').textContent = `Total: $${total.toFixed(2)}`;

        // Attach event listeners to all "Remove" buttons
        attachRemoveEventListeners();
    }

    // Function to attach event listeners to "Remove" buttons
    function attachRemoveEventListeners() {
        const removeButtons = document.querySelectorAll('.remove-button');
        removeButtons.forEach(button => {
            button.addEventListener('click', function () {
                const code = this.getAttribute('data-code');
                removeFromCart(code); // Call removeFromCart when button is clicked
            });
        });
    }

    // Function to remove a product from the cart
    function removeFromCart(code) {
        // Find the index of the product to remove
        const index = cart.findIndex(item => item.code === code);
        if (index > -1) {
            cart.splice(index, 1); // Remove the product from the cart
            console.log("Product removed from the cart:", code); // Log the removal
            updateCartDisplay(); // Update the cart display after removing the product
        } else {
            console.log("Product not found in the cart:", code); // Log if the product is not found
        }
    }

    // Function to handle the checkout process
    window.checkout = function () {
        const cartItemsList = document.getElementById('cart-items');
        if (cartItemsList.children.length === 0) {
            alert('Your cart is empty.');
            return;
        }

        // Prompt for customer name
        const customerName = prompt('Please enter the customer\'s name:');
        if (!customerName) {
            alert('Customer name is required.');
            return;
        }

        // Prepare the order data to be sent to the server
        fetch('/process-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cart, customerName })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Order placed successfully!');
                    cart = []; // Clear the cart after successful checkout
                    updateCartDisplay(); // Update the cart display
                } else {
                    alert(data.error);
                }
            })
            .catch(error => console.error('Error processing order:', error));
    };
});
