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
                amountReceived: amountReceived
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

                    // Show buttons for print invoice and next sale
                    printInvoiceButton.style.display = 'block';
                    nextSaleButton.style.display = 'block';
                } else {
                    alert(data.error);
                }
            })
            .catch(error => console.error('Error processing sale:', error));
    });
// Add event listener to "Print Invoice" button
printInvoiceButton.addEventListener('click', function () {
    const currentDate = new Date().toLocaleDateString('ar-EG'); // Date format in Arabic
    
    const invoiceContent = `
        <html lang="ar" dir="rtl">
        <head>
            <title>فاتورة شراء</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    direction: rtl;
                    text-align: right;
                    margin: 20px;
                    padding: 20px;
                }
                h1, h2, h3 {
                    text-align: center;
                    margin: 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                table, th, td {
                    border: 1px solid black;
                    padding: 10px;
                    text-align: center;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                td {
                    font-size: 14px;
                }
                .total-section {
                    margin-top: 20px;
                    text-align: right;
                }
                .total-section p {
                    margin: 5px 0;
                    font-size: 16px;
                }
                .bold {
                    font-weight: bold;
                }
                hr {
                    border: 1px solid black;
                    margin-top: 20px;
                }
                .center {
                    text-align: center;
                    margin-top: 20px;
                }
                .invoice-details {
                    margin-top: 20px;
                    font-size: 16px;
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <!-- Logo centré -->
                <div class="center">
                    <img src="images/logo1.png" alt="Logo" width="100" height="100">
                </div>
                
                <!-- Titre de la facture -->
                <h1>فاتورة شراء مبسطة</h1>
                
                <!-- Informations du client et date -->
                <div class="invoice-details">
                    <p><strong>رقم الفاتورة:</strong> 208</p>
                    <p><strong>التاريخ:</strong> ${currentDate}</p>
                    <p><strong>العميل:</strong> السيد ناصر فاضل</p>
                    <p><strong>رقم الهاتف:</strong> 97474727</p>
                </div>

                <!-- Tableau des achats -->
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>الرمز</th>
                            <th>الاسم</th>
                            <th>السعر</th>
                            <th>الكمية</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from(cartTableBody.rows).map(row => `
                            <tr>
                                <td>${row.cells[0]?.textContent || ''}</td>
                                <td>${row.cells[1]?.textContent || ''}</td>
                                <td>${row.cells[2]?.textContent || ''}</td>
                                <td>${row.cells[3]?.textContent || ''}</td>
                                <td>${row.cells[4]?.textContent || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Ligne de séparation -->
                <hr>

                <!-- Montants finaux -->
                <div class="total-section">
                    <p><span class="bold">المجموع الفرعي:</span> ر.ع ${saleAmountSpan.textContent}</p>
                    <p><span class="bold">المبلغ المستلم:</span> ر.ع ${saleReceivedSpan.textContent}</p>
                    <p><span class="bold">المبلغ المتبقي:</span> ر.ع ${saleChangeSpan.textContent}</p>
                </div>
                
                <!-- Informations supplémentaires -->
                <div class="center">
                    <p>محل رقم 2، علي الشيهاني بلازا، شارع 273 شمال الغربة، مسقط، عمان</p>
                    <p>الهاتف: 24902844 | رقم السجل التجاري: 1322465 | رقم البطاقة الضريبية: 8252706</p>
                    <p>الرقم الضريبي: OM1100107765</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Ouvrir une nouvelle fenêtre pour imprimer la facture
    const invoiceWindow = window.open('', 'PRINT', 'height=600,width=800');
    invoiceWindow.document.write(invoiceContent);
    invoiceWindow.document.close(); // Nécessaire pour IE >= 10
    invoiceWindow.focus(); // Nécessaire pour IE >= 10
    invoiceWindow.print();
    invoiceWindow.close();
});

// Add event listener to "Next Sale" button
nextSaleButton.addEventListener('click', function () {
    cartTableBody.innerHTML = ''; // Clear cart
    totalAmountDiv.textContent = 'Total Amount: $0.00'; // Reset total amount
    amountReceivedInput.value = ''; // Clear amount received input
    saleInfoDiv.style.display = 'none'; // Hide sale info
    printInvoiceButton.style.display = 'none'; // Hide print invoice button
    nextSaleButton.style.display = 'none'; // Hide next sale button
});


    // Add event listener to "Next Sale" button
    nextSaleButton.addEventListener('click', function () {
        cartTableBody.innerHTML = ''; // Clear cart
        totalAmountDiv.textContent = 'Total Amount: $0.00'; // Reset total amount
        amountReceivedInput.value = ''; // Clear amount received input
        saleInfoDiv.style.display = 'none'; // Hide sale info
        printInvoiceButton.style.display = 'none'; // Hide print invoice button
        nextSaleButton.style.display = 'none'; // Hide next sale button
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
