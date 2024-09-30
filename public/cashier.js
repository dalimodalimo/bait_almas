document.addEventListener('DOMContentLoaded', function () {
    const addToCartButton = document.getElementById('add-to-cart');
    const productCodeInput = document.getElementById('product-code');
    const productList = document.getElementById('product-list');
    const paymentMethodSelect = document.getElementById('payment-method');
    const amountReceivedInput = document.getElementById('amount-received');
    const payButton = document.getElementById('pay-button');
    const printInvoiceButton = document.getElementById('print-invoice');
    const nextSaleButton = document.getElementById('next-sale');
    const cartTableBody = document.querySelector('#cart-table tbody');
    const totalAmountDiv = document.getElementById('total-amount');
    const saleInfoDiv = document.getElementById('sale-info');
    const saleAmountSpan = document.getElementById('sale-amount');
    const saleReceivedSpan = document.getElementById('sale-received');
    const saleChangeSpan = document.getElementById('sale-change');

    // Variables to store client data
    let currentInvoiceId = null;
    let clientName = '';
    let clientPhone = '';

    // Fonction pour désactiver les boutons
    function disableButtons() {
        addToCartButton.classList.add('disabled');
        payButton.classList.add('disabled');
        addToCartButton.disabled = true;
        payButton.disabled = true;
    }

    // Fonction pour réactiver les boutons
    function enableButtons() {
        addToCartButton.classList.remove('disabled');
        payButton.classList.remove('disabled');
        addToCartButton.disabled = false;
        payButton.disabled = false;
    }

    // Fetch and populate product list
    fetch('/products')
        .then(response => response.json())
        .then(products => {
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.code;
                option.textContent = product.name;
                productList.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching products:', error));

    // Function to update the total amount
    function updateTotalAmount() {
        let totalAmount = 0;
        Array.from(cartTableBody.rows).forEach(row => {
            totalAmount += parseFloat(row.cells[4].textContent);
        });
        totalAmountDiv.textContent = `Total Amount: $${totalAmount.toFixed(2)}`;
    }

    // Add event listener to "Add to Cart" button
    addToCartButton.addEventListener('click', function () {
        const productCode = productCodeInput.value || productList.value;
        if (!productCode) {
            alert('Please enter a product code or select a product.');
            return;
        }

        fetch(`/product/${productCode}`)
            .then(response => response.json())
            .then(product => {
                if (product.error) {
                    alert(product.error);
                    return;
                }

                const existingRow = Array.from(cartTableBody.rows).find(row => row.cells[0].textContent === product.code);
                if (existingRow) {
                    const quantityCell = existingRow.cells[3];
                    const newQuantity = parseInt(quantityCell.textContent) + 1;
                    if (newQuantity > product.quantity) {
                        alert('Not enough stock available.');
                        return;
                    }
                    quantityCell.textContent = newQuantity;
                    existingRow.cells[4].textContent = (product.price * newQuantity).toFixed(2);
                } else {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${product.code}</td>
                        <td>${product.name}</td>
                        <td>${product.price.toFixed(2)}</td>
                        <td>1</td>
                        <td>${product.price.toFixed(2)}</td>
                        <td>
                            <button onclick="adjustQuantity('${product.code}', 1)">+</button>
                            <button onclick="adjustQuantity('${product.code}', -1)">-</button>
                            <button onclick="removeFromCart('${product.code}')">Remove</button>
                        </td>
                    `;
                    cartTableBody.appendChild(row);
                }

                productCodeInput.value = ''; // Clear the product code input field
                productList.value = ''; // Clear product list selection
                updateTotalAmount(); // Update the total amount display
            })
            .catch(error => console.error('Error fetching product:', error));
    });

    // Add event listener to "Pay" button
    payButton.addEventListener('click', function () {
        const amountReceived = parseFloat(amountReceivedInput.value);
        if (isNaN(amountReceived) || amountReceived <= 0) {
            alert('Please enter a valid amount received.');
            return;
        }

        const totalAmount = parseFloat(totalAmountDiv.textContent.replace('Total Amount: $', ''));
        if (amountReceived < totalAmount) {
            alert('Amount received is less than total amount.');
            return;
        }

        // Demander le nom du client et le numéro de téléphone avant de procéder au paiement
        clientName = prompt("Veuillez entrer le nom du client :");
        if (!clientName) {
            alert("Le nom du client est obligatoire.");
            return;
        }

        clientPhone = prompt("Veuillez entrer le numéro de téléphone du client :");

        fetch('/process-sale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cart: Array.from(cartTableBody.rows).map(row => ({
                    code: row.cells[0].textContent,
                    name: row.cells[1].textContent,
                    price: parseFloat(row.cells[2].textContent),
                    quantity: parseInt(row.cells[3].textContent)
                })),
                paymentMethod: paymentMethodSelect.value,
                amountReceived: amountReceived,
                clientName: clientName,   // Envoyer le nom du client
                clientPhone: clientPhone  // Envoyer le numéro de téléphone du client
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display sale details
                    saleAmountSpan.textContent = totalAmount.toFixed(2);
                    saleReceivedSpan.textContent = amountReceived.toFixed(2);
                    saleChangeSpan.textContent = (amountReceived - totalAmount).toFixed(2);
                    saleInfoDiv.style.display = 'block';

                    // Set the invoice ID for the current sale
                    currentInvoiceId = data.invoiceId;

                    // Show buttons for print invoice and next sale
                    printInvoiceButton.style.display = 'block';
                    nextSaleButton.style.display = 'block';
                    disableButtons();
                } else {
                    alert(data.error);
                }
            })
            .catch(error => console.error('Error processing sale:', error));
    });

// Add event listener to "Print Invoice" button
printInvoiceButton.addEventListener('click', function () {
    const iframe = document.getElementById('invoiceIframe');

    // Load facture.html content into the iframe
    fetch('facture.html')
        .then(response => response.text())
        .then(htmlContent => {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            iframeDocument.open();
            iframeDocument.write(htmlContent);
            iframeDocument.close();

            // Wait for the iframe to load its content fully
            iframe.onload = function () {
                // Inject data into the invoice fields in the iframe
                const invoiceItems = iframeDocument.getElementById('invoice-items');
                const subtotalAmountElem = iframeDocument.getElementById('subtotal-amount');
                const vatAmountElem = iframeDocument.getElementById('vat-amount');
                const totalAmountElem = iframeDocument.getElementById('total-amount');
                const invoiceDateElem = iframeDocument.getElementById('invoice-date');
                const invoiceNumberElem = iframeDocument.getElementById('invoice-number');
                const clientNameElem = iframeDocument.getElementById('client-name');
                const clientPhoneElem = iframeDocument.getElementById('client-phone');
                const paymentMethodElem = iframeDocument.getElementById('payment-method');

                // Fill in the invoice items
                Array.from(cartTableBody.rows).forEach(row => {
                    const newRow = iframeDocument.createElement('tr');
                    newRow.innerHTML = `
                        <td>${row.cells[0]?.textContent || ''}</td>
                        <td>${row.cells[1]?.textContent || ''}</td>
                        <td>${row.cells[2]?.textContent || ''}</td>
                        <td>${row.cells[3]?.textContent || ''}</td>
                        <td>${row.cells[4]?.textContent || ''}</td>
                    `;
                    invoiceItems.appendChild(newRow);
                });

                // Calculate totals
                let subtotal = 0;
                Array.from(cartTableBody.rows).forEach(row => {
                    subtotal += parseFloat(row.cells[4]?.textContent || 0);
                });
                const vat = subtotal * 0.05; // Assume 5% VAT
                const totalWithVat = subtotal + vat;

                // Fill in calculated amounts
                subtotalAmountElem.textContent = subtotal.toFixed(2);
                vatAmountElem.textContent = vat.toFixed(2);
                totalAmountElem.textContent = totalWithVat.toFixed(2);
                invoiceDateElem.textContent = new Date().toLocaleDateString('ar-EG');
                invoiceNumberElem.textContent = currentInvoiceId; // Set the invoice ID
                clientNameElem.textContent = clientName; // Set client name
                clientPhoneElem.textContent = clientPhone; // Set client phone
                paymentMethodElem.textContent = paymentMethodSelect.value; // Set payment method

                // Trigger print
                iframe.contentWindow.print();
            };
        })
        .catch(error => console.error('Error loading facture.html:', error));
});

    // Réinitialiser pour une nouvelle vente
    nextSaleButton.addEventListener('click', function () {
        cartTableBody.innerHTML = ''; // Clear cart
        totalAmountDiv.textContent = 'Total Amount: $0.00'; // Reset total amount
        amountReceivedInput.value = ''; // Clear amount received input
        saleInfoDiv.style.display = 'none'; // Hide sale info
        printInvoiceButton.style.display = 'none'; // Hide print invoice button
        nextSaleButton.style.display = 'none'; // Hide next sale button
        enableButtons();
    });

    // Adjust quantity
    window.adjustQuantity = function (code, delta) {
        const row = Array.from(cartTableBody.rows).find(row => row.cells[0].textContent === code);
        if (row) {
            const quantityCell = row.cells[3];
            const newQuantity = parseInt(quantityCell.textContent) + delta;
            if (newQuantity <= 0) {
                removeFromCart(code);
            } else {
                const price = parseFloat(row.cells[2].textContent);
                const totalCell = row.cells[4];

                fetch(`/product/${code}`)
                    .then(response => response.json())
                    .then(product => {
                        if (newQuantity > product.quantity) {
                            alert('Not enough stock available.');
                            return;
                        }
                        quantityCell.textContent = newQuantity;
                        totalCell.textContent = (price * newQuantity).toFixed(2);
                        updateTotalAmount(); // Update the total amount display
                    });
            }
        }
    };

    // Remove product from cart
    window.removeFromCart = function (code) {
        const row = Array.from(cartTableBody.rows).find(row => row.cells[0].textContent === code);
        if (row) {
            row.remove();
            updateTotalAmount(); // Update the total amount display
        }
    };


    
    // Handle logout
    document.getElementById('logout-form').addEventListener('submit', function (e) {
        e.preventDefault(); // Empêcher le comportement par défaut du formulaire

        fetch('/logout', {
            method: 'POST'
        })
        .then(response => {
            if (response.ok) {
                // Rediriger vers la page de login après la déconnexion
                window.location.href = '/';
            } else {
                alert('Erreur lors de la déconnexion');
            }
        })
        .catch(error => console.error('Erreur lors de la déconnexion:', error));
    });

});
