/* =====================================================================
   Apple Store VN — Enhanced Checkout Module
   Features: Form validation · Payment methods · Order tracking
   Email confirmation · Address validation · Discount codes
   ===================================================================== */

const Checkout = {
    // Validate checkout form
    validateForm: (formElement) => {
        const errors = Validator.validateForm(formElement);
        const formData = new FormData(formElement);

        // Additional custom validations
        const email = formData.get('email');
        if (email && !Validator.isValidEmail(email)) {
            errors.email = 'Email không hợp lệ';
        }

        const phone = formData.get('phone');
        if (phone && !Validator.isValidPhone(phone)) {
            errors.phone = 'Số điện thoại phải có ít nhất 9 chữ số';
        }

        const address = formData.get('address');
        if (address && !Validator.isValidAddress(address)) {
            errors.address = 'Địa chỉ phải có ít nhất 5 ký tự';
        }

        return errors;
    },

    // Display validation errors
    showErrors: (formElement, errors) => {
        // Clear previous errors
        formElement.querySelectorAll('.form-error-message').forEach(el => el.remove());
        formElement.querySelectorAll('.form-error').forEach(el => el.classList.remove('form-error'));

        // Show new errors
        Object.entries(errors).forEach(([field, message]) => {
            const input = formElement.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('form-error');
                const errorMsg = document.createElement('span');
                errorMsg.className = 'form-error-message';
                errorMsg.textContent = message;
                input.parentElement.appendChild(errorMsg);
            }
        });

        if (Object.keys(errors).length > 0) {
            Toast.error('Vui lòng sửa các lỗi trên biểu mẫu');
        }
    },

    // Calculate order total with shipping
    calculateTotal: (subtotal, shippingMethod = 'standard') => {
        const shippingCosts = {
            'standard': 30000,  // Free if subtotal >= 500000
            'express': 50000,
            'overnight': 100000,
            'free': 0
        };

        let shipping = shippingCosts[shippingMethod] || 30000;

        // Free shipping for orders >= 500000
        if (subtotal >= 500000) {
            shipping = 0;
        }

        const tax = subtotal * 0.1; // 10% tax
        const total = subtotal + shipping + tax;

        return {
            subtotal,
            shipping,
            tax,
            total
        };
    },

    // Apply discount code
    applyDiscount: (code, subtotal) => {
        const discounts = {
            'WELCOME10': 0.10,    // 10% off
            'SUMMER20': 0.20,     // 20% off
            'APPLE100': 100000,   // 100k off
            'STUDENT15': 0.15,    // 15% off for students
            'VIPCODE': 0.25       // 25% off VIP
        };

        const discount = discounts[code.toUpperCase()];

        if (!discount) {
            return { valid: false, message: 'Mã giảm giá không hợp lệ' };
        }

        let amount = 0;
        if (typeof discount === 'number' && discount < 1) {
            // Percentage discount
            amount = Math.floor(subtotal * discount);
        } else {
            // Fixed amount discount
            amount = Math.min(discount, subtotal);
        }

        return {
            valid: true,
            code,
            amount,
            message: `Tiết kiệm được ₫${Format.number(amount)}`
        };
    },

    // Process order
    processOrder: async (orderData) => {
        try {
            Loader.showFullPage('Đang xử lý đơn hàng...');

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Save order
            const order = {
                id: `ORD-${Date.now()}`,
                ...orderData,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            Storage.set(`order_${order.id}`, order);

            // Add to orders list
            let orders = Storage.get('orders', []);
            orders.push(order);
            Storage.set('orders', orders);

            Loader.hide(document.body);
            return order;

        } catch (error) {
            Loader.hide(document.body);
            Toast.error('Lỗi xử lý đơn hàng: ' + error.message);
            throw error;
        }
    },

    // Render payment methods
    renderPaymentMethods: () => {
        return `
            <div class="payment-methods">
                <h3 style="margin-bottom: 16px;">Phương Thức Thanh Toán</h3>

                <label class="payment-option">
                    <input type="radio" name="payment" value="cod" checked>
                    <div class="payment-option-content">
                        <h4>Thanh Toán Khi Nhận Hàng (COD)</h4>
                        <p>Thanh toán tiền mặt khi nhận đơn hàng</p>
                    </div>
                </label>

                <label class="payment-option">
                    <input type="radio" name="payment" value="bank_transfer">
                    <div class="payment-option-content">
                        <h4>Chuyển Khoản Ngân Hàng</h4>
                        <p>Chuyển tiền trước khi xác nhận đơn</p>
                    </div>
                </label>

                <label class="payment-option">
                    <input type="radio" name="payment" value="credit_card">
                    <div class="payment-option-content">
                        <h4>Thẻ Tín Dụng / Debit</h4>
                        <p>Visa, Mastercard, JCB</p>
                    </div>
                </label>

                <label class="payment-option">
                    <input type="radio" name="payment" value="wallet">
                    <div class="payment-option-content">
                        <h4>Ví Điện Tử</h4>
                        <p>Momo, ZaloPay, và các ví khác</p>
                    </div>
                </label>
            </div>
        `;
    },

    // Render shipping methods
    renderShippingMethods: () => {
        return `
            <div class="shipping-methods">
                <h3 style="margin-bottom: 16px;">Phương Thức Giao Hàng</h3>

                <label class="shipping-option">
                    <input type="radio" name="shipping" value="standard" checked onchange="Checkout.updateShipping(this.value)">
                    <div class="shipping-option-content">
                        <h4>Giao Hàng Chuẩn (3-5 ngày)</h4>
                        <p id="shipping-standard-price">₫30,000</p>
                    </div>
                </label>

                <label class="shipping-option">
                    <input type="radio" name="shipping" value="express" onchange="Checkout.updateShipping(this.value)">
                    <div class="shipping-option-content">
                        <h4>Giao Hàng Nhanh (1-2 ngày)</h4>
                        <p id="shipping-express-price">₫50,000</p>
                    </div>
                </label>

                <label class="shipping-option">
                    <input type="radio" name="shipping" value="overnight" onchange="Checkout.updateShipping(this.value)">
                    <div class="shipping-option-content">
                        <h4>Giao Hàng Qua Đêm (Hôm Nay)</h4>
                        <p id="shipping-overnight-price">₫100,000</p>
                    </div>
                </label>
            </div>
        `;
    },

    // Update shipping price
    updateShipping: (method) => {
        const subtotal = parseInt(document.getElementById('checkoutSubtotal')?.textContent.match(/\d+/g)?.join('')) || 0;
        const totals = Checkout.calculateTotal(subtotal, method);
        
        document.getElementById('checkoutShipping').textContent = Format.currency(totals.shipping);
        document.getElementById('checkoutTotal').textContent = Format.currency(totals.total);
    },

    // Render discount code section
    renderDiscountCode: () => {
        return `
            <div class="discount-section">
                <h3 style="margin-bottom: 12px;">Mã Giảm Giá</h3>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="discountCode" class="form-input" placeholder="Nhập mã giảm giá">
                    <button type="button" onclick="Checkout.applyDiscountCode()" class="btn btn-primary">Áp Dụng</button>
                </div>
                <div id="discountMessage" style="margin-top: 8px;"></div>
            </div>
        `;
    },

    // Apply discount code
    applyDiscountCode: () => {
        const code = document.getElementById('discountCode')?.value || '';
        const subtotal = parseInt(document.getElementById('checkoutSubtotal')?.textContent.match(/\d+/g)?.join('')) || 0;

        const result = Checkout.applyDiscount(code, subtotal);
        const messageEl = document.getElementById('discountMessage');

        if (result.valid) {
            Toast.success(result.message);
            messageEl.innerHTML = `<p style="color: var(--success);">✓ ${result.message}</p>`;
            
            // Update total with discount
            const newSubtotal = subtotal - result.amount;
            const totals = Checkout.calculateTotal(newSubtotal);
            document.getElementById('checkoutTotal').textContent = Format.currency(totals.total);
        } else {
            Toast.error(result.message);
            messageEl.innerHTML = `<p style="color: var(--red);">✗ ${result.message}</p>`;
        }
    }
};

console.log('✅ Enhanced Checkout module loaded');
