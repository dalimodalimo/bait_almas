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

    // Variables pour les modales
    const messageModal = document.getElementById('messageModal');
    const modalMessage = document.getElementById('modal-message');
    const modalOkButton = document.getElementById('modal-ok-button');
    const clientInfoModal = document.getElementById('clientInfoModal');
    const saveClientInfoButton = document.getElementById('save-client-info');
    const clientNameInput = document.getElementById('client-name');
    const clientPhoneInput = document.getElementById('client-phone');
    
    let clientName = '';
    let clientPhone = '';
    let currentInvoiceId = null;

    // Fonction pour afficher une modale de message
    function showMessageModal(message) {
        modalMessage.textContent = message;
        messageModal.style.display = 'block';
    }

    // Fermer la modale quand l'utilisateur clique sur "OK"
    modalOkButton.onclick = function () {
        messageModal.style.display = 'none';
    };

    // Fonction pour afficher la modale de saisie des infos client
    function showClientInfoModal() {
        clientInfoModal.style.display = 'block';
    }

    // Fermer la modale d'info client une fois les informations saisies
    saveClientInfoButton.onclick = function () {
        clientName = clientNameInput.value;
        clientPhone = clientPhoneInput.value;

        if (!clientName) {
            showMessageModal('اسم العميل مطلوب.');
            return;
        }

        clientInfoModal.style.display = 'none'; // Fermer la modale une fois les infos saisies
        processSale(); // Continuer avec le traitement de la vente
    };

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
        .catch(error => console.error('حدث خطأ أثناء جلب المنتجات:', error));

    // Fonction pour mettre à jour le montant total
    function updateTotalAmount() {
        let totalAmount = 0;
        Array.from(cartTableBody.rows).forEach(row => {
            totalAmount += parseFloat(row.cells[4].textContent);
        });
        totalAmountDiv.textContent = `المبلغ الإجمالي: ${totalAmount.toFixed(2)} ر.ع`;
    }

    // Ajouter un écouteur d'événement au bouton "إضافة إلى السلة"
    addToCartButton.addEventListener('click', function () {
        const productCode = productCodeInput.value || productList.value;
        if (!productCode) {
            showMessageModal('الرجاء إدخال رمز المنتج أو اختيار منتج.');
            return;
        }

        fetch(`/product/${productCode}`)
            .then(response => response.json())
            .then(product => {
                if (product.error) {
                    showMessageModal(product.error);
                    return;
                }

                const existingRow = Array.from(cartTableBody.rows).find(row => row.cells[0].textContent === product.code);
                if (existingRow) {
                    const quantityCell = existingRow.cells[3];
                    const newQuantity = parseInt(quantityCell.textContent) + 1;
                    if (newQuantity > product.quantity) {
                        showMessageModal('الكمية غير كافية في المخزون.');
                        return;
                    }
                    quantityCell.textContent = newQuantity;
                    existingRow.cells[4].textContent = (product.price * newQuantity).toFixed(2);
                } else {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${product.code}</td>
                        <td>${product.name}</td>
                        <td>${product.price.toFixed(2)} ر.ع</td>
                        <td>1</td>
                        <td>${product.price.toFixed(2)} ر.ع</td>
                        <td>
                            <button onclick="adjustQuantity('${product.code}', 1)">+</button>
                            <button onclick="adjustQuantity('${product.code}', -1)">-</button>
                            <button onclick="removeFromCart('${product.code}')">إزالة</button>
                        </td>
                    `;
                    cartTableBody.appendChild(row);
                }

                productCodeInput.value = ''; // Effacer le champ du code produit
                productList.value = ''; // Effacer la sélection de produit
                updateTotalAmount(); // Mettre à jour le montant total
            })
            .catch(error => console.error('حدث خطأ أثناء جلب المنتج:', error));
    });

    // Ajouter un écouteur d'événement au bouton "دفع"
    payButton.addEventListener('click', function () {
        const amountReceived = parseFloat(amountReceivedInput.value);
        if (isNaN(amountReceived) || amountReceived <= 0) {
            showMessageModal('الرجاء إدخال المبلغ المستلم بشكل صحيح.');
            return;
        }

        const totalAmount = parseFloat(totalAmountDiv.textContent.replace('المبلغ الإجمالي: ', '').replace(' ر.ع', ''));
        if (amountReceived < totalAmount) {
            showMessageModal('المبلغ المستلم أقل من المبلغ الإجمالي.');
            return;
        }

        // Afficher la modale pour les infos du client avant de procéder au paiement
        showClientInfoModal();
    });

    // Fonction pour traiter la vente après avoir saisi les infos du client
    function processSale() {
        const amountReceived = parseFloat(amountReceivedInput.value);
        const totalAmount = parseFloat(totalAmountDiv.textContent.replace('المبلغ الإجمالي: ', '').replace(' ر.ع', ''));

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
                // Afficher les détails de la vente
                saleAmountSpan.textContent = totalAmount.toFixed(2);
                saleReceivedSpan.textContent = amountReceived.toFixed(2);
                saleChangeSpan.textContent = (amountReceived - totalAmount).toFixed(2);
                saleInfoDiv.style.display = 'block';

                // Enregistrer l'ID de la facture
                currentInvoiceId = data.invoiceId;

                // Afficher les boutons pour imprimer la facture et effectuer une nouvelle vente
                printInvoiceButton.style.display = 'block';
                nextSaleButton.style.display = 'block';
                disableButtons();
            } else {
                showMessageModal(data.error);
            }
        })
        .catch(error => console.error('حدث خطأ أثناء معالجة البيع:', error));
    }

    // Ajouter un écouteur d'événement au bouton "طباعة الفاتورة"
    printInvoiceButton.addEventListener('click', function () {
        const iframe = document.getElementById('invoiceIframe');

        // Charger le contenu de facture.html dans l'iframe
        fetch('facture.html')
            .then(response => response.text())
            .then(htmlContent => {
                const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
                iframeDocument.open();
                iframeDocument.write(htmlContent);
                iframeDocument.close();

                // Attendre que l'iframe charge complètement son contenu
                iframe.onload = function () {
                    // Injecter les données dans les champs de la facture dans l'iframe
                    const invoiceItems = iframeDocument.getElementById('invoice-items');
                    const subtotalAmountElem = iframeDocument.getElementById('subtotal-amount');
                    const vatAmountElem = iframeDocument.getElementById('vat-amount');
                    const totalAmountElem = iframeDocument.getElementById('total-amount');
                    const invoiceDateElem = iframeDocument.getElementById('invoice-date');
                    const invoiceNumberElem = iframeDocument.getElementById('invoice-number');
                    const clientNameElem = iframeDocument.getElementById('client-name');
                    const clientPhoneElem = iframeDocument.getElementById('client-phone');
                    const paymentMethodElem = iframeDocument.getElementById('payment-method');

                    // Remplir les éléments de la facture
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

                    // Calculer les totaux
                    let subtotal = 0;
                    Array.from(cartTableBody.rows).forEach(row => {
                        subtotal += parseFloat(row.cells[4]?.textContent || 0);
                    });
                    const vat = subtotal * 0.05; // Supposer une TVA de 5 %
                    const totalWithVat = subtotal + vat;

                    // Remplir les montants calculés
                    subtotalAmountElem.textContent = subtotal.toFixed(2);
                    vatAmountElem.textContent = vat.toFixed(2);
                    totalAmountElem.textContent = totalWithVat.toFixed(2);
                    invoiceDateElem.textContent = new Date().toLocaleDateString('ar-EG');
                    invoiceNumberElem.textContent = currentInvoiceId; // Définir l'ID de la facture
                    clientNameElem.textContent = clientName; // Définir le nom du client
                    clientPhoneElem.textContent = clientPhone; // Définir le numéro de téléphone du client
                    paymentMethodElem.textContent = paymentMethodSelect.value; // Définir la méthode de paiement

                    // Déclencher l'impression
                    iframe.contentWindow.print();
                };
            })
            .catch(error => console.error('حدث خطأ أثناء تحميل الفاتورة:', error));
    });

    // Réinitialiser pour une nouvelle vente
    nextSaleButton.addEventListener('click', function () {
        cartTableBody.innerHTML = ''; // Vider le panier
        totalAmountDiv.textContent = 'المبلغ الإجمالي: 0.00 ر.ع'; // Réinitialiser le montant total
        amountReceivedInput.value = ''; // Effacer le montant reçu
        saleInfoDiv.style.display = 'none'; // Masquer les informations de vente
        printInvoiceButton.style.display = 'none'; // Masquer le bouton de facture
        nextSaleButton.style.display = 'none'; // Masquer le bouton nouvelle vente
        clientNameInput.value = ''; // Réinitialiser le champ du nom du client
        clientPhoneInput.value = ''; // Réinitialiser le champ du téléphone du client
        enableButtons();
    });

    // Ajuster la quantité
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
                            showMessageModal('الكمية غير كافية في المخزون.');
                            return;
                        }
                        quantityCell.textContent = newQuantity;
                        totalCell.textContent = (price * newQuantity).toFixed(2);
                        updateTotalAmount(); // Mettre à jour le montant total
                    });
            }
        }
    };

    // Supprimer un produit du panier
    window.removeFromCart = function (code) {
        const row = Array.from(cartTableBody.rows).find(row => row.cells[0].textContent === code);
        if (row) {
            row.remove();
            updateTotalAmount(); // Mettre à jour le montant total
        }
    };

    // Gérer la déconnexion
    document.getElementById('logout-form').addEventListener('submit', function (e) {
        e.preventDefault(); // Empêcher le comportement par défaut du formulaire

        fetch('/logout', {
            method: 'POST'
        })
        .then(response => {
            if (response.ok) {
                // Rediriger vers la page de connexion après la déconnexion
                window.location.href = '/';
            } else {
                showMessageModal('حدث خطأ أثناء تسجيل الخروج.');
            }
        })
        .catch(error => console.error('حدث خطأ أثناء تسجيل الخروج:', error));
    });

});
