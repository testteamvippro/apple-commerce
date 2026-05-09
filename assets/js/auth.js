class Auth {
  constructor() {
    this.user = this.loadUser();
    this.token = localStorage.getItem('auth-token');
  }

  async register(name, email, phone, password) {
    // Validate inputs
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!this.validatePassword(password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    if (!this.validatePhone(phone)) {
      throw new Error('Invalid phone number');
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name,
          email,
          phone,
          password: this.hashPassword(password)
        })
      });

      const result = await response.json();

      if (result.success) {
        this.user = result.data;
        this.token = result.token;
        localStorage.setItem('auth-token', this.token);
        localStorage.setItem('auth-user', JSON.stringify(this.user));
        return result.data;
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error) {
      throw error;
    }
  }

  async login(email, password, rememberMe = false) {
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email,
          password: this.hashPassword(password)
        })
      });

      const result = await response.json();

      if (result.success) {
        this.user = result.data;
        this.token = result.token;
        localStorage.setItem('auth-token', this.token);
        localStorage.setItem('auth-user', JSON.stringify(this.user));

        if (rememberMe) {
          localStorage.setItem('remember-email', email);
        }

        return result.data;
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  }

  logout() {
    this.user = null;
    this.token = null;
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
  }

  isLoggedIn() {
    return this.token && this.user;
  }

  getUser() {
    return this.user;
  }

  isAdmin() {
    return this.user && this.user.role === 'admin';
  }

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  validatePassword(password) {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return re.test(password);
  }

  validatePhone(phone) {
    const re = /^[\d\-\+\(\)\s]{10,}$/;
    return re.test(phone);
  }

  validateAddress(address) {
    return address && address.length >= 10;
  }

  hashPassword(password) {
    // Simple client-side hash for demo (use proper hashing in production)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash).toString(36);
  }

  loadUser() {
    const userStr = localStorage.getItem('auth-user');
    return userStr ? JSON.parse(userStr) : null;
  }

  updateUIForAuth() {
    const userNameElement = document.querySelector('[data-auth="user-name"]');
    if (userNameElement) {
      if (this.isLoggedIn()) {
        userNameElement.textContent = `👤 ${this.user.name}`;
        userNameElement.style.display = 'inline';
      } else {
        userNameElement.style.display = 'none';
      }
    }
  }
}

// Global auth instance
const auth = new Auth();

// Update UI on load
document.addEventListener('DOMContentLoaded', () => {
  auth.updateUIForAuth();
});
