/* =====================================================================
   Apple Store VN — Utilities & Validation Module
   Features: Form validation · Toast notifications · Loading states ·
   Data persistence · API helpers · Error handling
   ===================================================================== */

// ===================== VALIDATION UTILITIES =====================

const Validator = {
    // Email validation (RFC 5322 simplified)
    isValidEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    // Phone number validation (Vietnamese format)
    isValidPhone: (phone) => {
        const regex = /^[0-9\-\+\s\(\)]{9,}$/;
        return regex.test(phone.replace(/\s/g, ''));
    },

    // Name validation (at least 2 chars, no numbers)
    isValidName: (name) => {
        const regex = /^[a-zA-ZÀ-ỿ\s]{2,}$/;
        return regex.test(name.trim());
    },

    // Address validation (at least 5 chars)
    isValidAddress: (address) => {
        return address.trim().length >= 5;
    },

    // Strong password check
    isStrongPassword: (password) => {
        return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
    },

    // Validate all form fields
    validateForm: (formElement) => {
        const errors = {};
        const formData = new FormData(formElement);

        for (let [key, value] of formData.entries()) {
            const field = formElement.querySelector(`[name="${key}"]`);
            const type = field?.dataset.validate || field?.type;

            switch(type) {
                case 'email':
                    if (!value || !Validator.isValidEmail(value)) {
                        errors[key] = 'Email không hợp lệ';
                    }
                    break;
                case 'phone':
                    if (!value || !Validator.isValidPhone(value)) {
                        errors[key] = 'Số điện thoại không hợp lệ';
                    }
                    break;
                case 'name':
                case 'firstName':
                case 'lastName':
                    if (!value || !Validator.isValidName(value)) {
                        errors[key] = 'Tên không hợp lệ';
                    }
                    break;
                case 'address':
                    if (!value || !Validator.isValidAddress(value)) {
                        errors[key] = 'Địa chỉ không hợp lệ';
                    }
                    break;
                case 'required':
                    if (!value || !value.trim()) {
                        errors[key] = 'Trường này bắt buộc';
                    }
                    break;
            }
        }

        return errors;
    }
};

// ===================== TOAST NOTIFICATIONS =====================

const Toast = {
    create: (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                ${type === 'success' ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                ${type === 'error' ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>' : ''}
                ${type === 'warning' ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>' : ''}
                <span>${message}</span>
                <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
            </div>
        `;

        const container = document.querySelector('.toast-container') || (() => {
            const div = document.createElement('div');
            div.className = 'toast-container';
            document.body.appendChild(div);
            return div;
        })();

        container.appendChild(toast);
        
        if (duration > 0) {
            setTimeout(() => toast.remove(), duration);
        }

        return toast;
    },

    success: (message) => Toast.create(message, 'success'),
    error: (message) => Toast.create(message, 'error', 4000),
    warning: (message) => Toast.create(message, 'warning'),
    info: (message) => Toast.create(message, 'info')
};

// ===================== LOADING STATE =====================

const Loader = {
    show: (element, message = 'Loading...') => {
        const loader = document.createElement('div');
        loader.className = 'loader-overlay';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <p class="loader-text">${message}</p>
            </div>
        `;
        element.appendChild(loader);
        return loader;
    },

    hide: (element) => {
        const loader = element.querySelector('.loader-overlay');
        if (loader) loader.remove();
    },

    showFullPage: (message = 'Loading...') => {
        const loader = Loader.show(document.body, message);
        loader.classList.add('fullpage');
        return loader;
    }
};

// ===================== DATA PERSISTENCE =====================

const Storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },

    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage error:', e);
            return defaultValue;
        }
    },

    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },

    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    }
};

// ===================== API HELPERS =====================

const API = {
    // Generic API call with error handling
    call: async (endpoint, options = {}) => {
        try {
            const response = await fetch(endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // POST with JSON body
    post: (endpoint, data, options = {}) => {
        return API.call(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    },

    // GET request
    get: (endpoint, options = {}) => {
        return API.call(endpoint, { method: 'GET', ...options });
    },

    // PUT request
    put: (endpoint, data, options = {}) => {
        return API.call(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            ...options
        });
    }
};

// ===================== FORMATTING HELPERS =====================

const Format = {
    // Format currency (Vietnamese Dong)
    currency: (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    },

    // Format number with thousand separators
    number: (value) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    },

    // Format date
    date: (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },

    // Format time
    time: (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    // Truncate text
    truncate: (text, length = 100) => {
        return text.length > length ? text.substring(0, length) + '...' : text;
    }
};

// ===================== DOM HELPERS =====================

const DOM = {
    // Query selector wrapper with error handling
    query: (selector, parent = document) => {
        try {
            return parent.querySelector(selector);
        } catch (e) {
            console.error('Query error:', e);
            return null;
        }
    },

    // Query all with error handling
    queryAll: (selector, parent = document) => {
        try {
            return Array.from(parent.querySelectorAll(selector));
        } catch (e) {
            console.error('QueryAll error:', e);
            return [];
        }
    },

    // Show element with animation
    show: (element, display = 'block') => {
        if (element) {
            element.style.display = display;
            element.classList.add('fade-in');
        }
    },

    // Hide element with animation
    hide: (element) => {
        if (element) {
            element.classList.add('fade-out');
            setTimeout(() => {
                element.style.display = 'none';
                element.classList.remove('fade-out');
            }, 300);
        }
    },

    // Add class with animation
    addClass: (element, className) => {
        if (element) element.classList.add(className);
    },

    // Remove class
    removeClass: (element, className) => {
        if (element) element.classList.remove(className);
    },

    // Toggle class
    toggleClass: (element, className) => {
        if (element) element.classList.toggle(className);
    },

    // Set HTML safely
    setHTML: (element, html) => {
        if (element) {
            element.innerHTML = html;
        }
    },

    // Get form data as object
    getFormData: (formElement) => {
        const formData = new FormData(formElement);
        return Object.fromEntries(formData.entries());
    }
};

// ===================== ANALYTICS HELPERS =====================

const Analytics = {
    // Track custom event
    trackEvent: (eventName, eventData = {}) => {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, eventData);
        }
        if (typeof fbq !== 'undefined') {
            fbq('track', eventName, eventData);
        }
    },

    // Track page view
    trackPageView: (pageName) => {
        Analytics.trackEvent('page_view', { page_title: pageName });
    },

    // Track search
    trackSearch: (searchTerm) => {
        Analytics.trackEvent('search', { search_term: searchTerm });
    },

    // Track purchase
    trackPurchase: (orderId, value, items = []) => {
        Analytics.trackEvent('purchase', {
            transaction_id: orderId,
            value,
            currency: 'VND',
            items
        });
    }
};

// ===================== DEBOUNCE & THROTTLE =====================

const Timing = {
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

console.log('✅ Utils module loaded');
