class UserProfile {
  constructor() {
    this.user = auth.getUser();
  }

  async loadProfile(userId) {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const result = await response.json();

      if (result.success) {
        this.user = result.data;
        return result.data;
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async updateProfile(name, email, phone, birthDate) {
    try {
      const response = await fetch(`/api/users/${this.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-profile',
          name,
          email,
          phone,
          birthDate
        })
      });

      const result = await response.json();

      if (result.success) {
        this.user = result.data;
        localStorage.setItem('auth-user', JSON.stringify(this.user));
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
      throw new Error('New passwords do not match');
    }

    if (!auth.validatePassword(newPassword)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    try {
      const response = await fetch(`/api/users/${this.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          currentPassword: auth.hashPassword(currentPassword),
          newPassword: auth.hashPassword(newPassword)
        })
      });

      const result = await response.json();

      if (result.success) {
        return true;
      } else {
        throw new Error(result.message || 'Failed to change password');
      }
    } catch (error) {
      throw error;
    }
  }

  async addAddress(address, city, zip, country, isDefault = false) {
    if (!auth.validateAddress(address)) {
      throw new Error('Invalid address format');
    }

    try {
      const response = await fetch(`/api/users/${this.user.id}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          city,
          zip,
          country,
          isDefault
        })
      });

      const result = await response.json();

      if (result.success) {
        this.user.addresses = result.data;
        localStorage.setItem('auth-user', JSON.stringify(this.user));
        return result.data;
      }
    } catch (error) {
      throw error;
    }
  }

  async removeAddress(addressId) {
    try {
      const response = await fetch(`/api/users/${this.user.id}/addresses/${addressId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        this.user.addresses = this.user.addresses.filter(a => a.id !== addressId);
        localStorage.setItem('auth-user', JSON.stringify(this.user));
        return true;
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteAccount(password) {
    if (!confirm('Are you sure? This action cannot be undone.')) {
      return false;
    }

    try {
      const response = await fetch(`/api/users/${this.user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: auth.hashPassword(password)
        })
      });

      const result = await response.json();

      if (result.success) {
        auth.logout();
        return true;
      } else {
        throw new Error(result.message || 'Failed to delete account');
      }
    } catch (error) {
      throw error;
    }
  }

  getAddresses() {
    return this.user.addresses || [];
  }

  getDefaultAddress() {
    return this.user.addresses?.find(a => a.isDefault) || null;
  }
}

// Global instance
const userProfile = new UserProfile();
