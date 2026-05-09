class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.init();
  }

  async init() {
    if (!auth.isAdmin()) {
      window.location.href = '/login.html';
      return;
    }

    await this.loadProducts();
    this.setupEventListeners();
  }

  async loadProducts() {
    try {
      const response = await fetch('/api/admin?action=products');
      const result = await response.json();

      if (result.success) {
        this.products = result.data;
        this.filteredProducts = this.products;
        this.renderProductsTable();
      }
    } catch (error) {
      console.error('Error loading products:', error);
      showToast('Failed to load products', 'error');
    }
  }

  renderProductsTable() {
    const container = document.getElementById('products-table-body');
    if (!container) return;

    if (this.filteredProducts.length === 0) {
      container.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No products found</td></tr>';
      return;
    }

    container.innerHTML = this.filteredProducts.map(product => `
      <tr>
        <td>
          <input type="checkbox" class="product-checkbox" value="${product.id}">
        </td>
        <td>
          <div class="product-preview">
            <span class="product-icon">📱</span>
            ${product.name}
          </div>
        </td>
        <td>${product.category || 'N/A'}</td>
        <td>₫${product.price.toLocaleString()}</td>
        <td>${product.stock || 0}</td>
        <td>
          <span class="stock-badge ${product.stock > 10 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}">
            ${product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
          </span>
        </td>
        <td>
          <button onclick="productManager.openEditModal('${product.id}')" class="action-btn">✏️ Edit</button>
          <button onclick="productManager.deleteProduct('${product.id}')" class="action-btn danger">🗑️ Delete</button>
        </td>
      </tr>
    `).join('');
  }

  setupEventListeners() {
    // Search/filter
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterProducts(e.target.value);
      });
    }

    // Add product button
    const addBtn = document.getElementById('add-product-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.openAddModal();
      });
    }

    // Modal close button
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Form submit
    const form = document.getElementById('product-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProduct();
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        auth.logout();
        window.location.href = '/';
      });
    }
  }

  filterProducts(query) {
    const q = query.toLowerCase();
    this.filteredProducts = this.products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
    this.renderProductsTable();
  }

  openAddModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
      document.getElementById('modal-title').textContent = 'Add New Product';
      document.getElementById('product-form').reset();
      document.getElementById('product-id').value = '';
      modal.style.display = 'flex';
    }
  }

  async openEditModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    if (modal) {
      document.getElementById('modal-title').textContent = 'Edit Product';
      document.getElementById('product-id').value = product.id;
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-category').value = product.category;
      document.getElementById('product-description').value = product.description || '';
      document.getElementById('product-price').value = product.price;
      document.getElementById('product-stock').value = product.stock;
      modal.style.display = 'flex';
    }
  }

  closeModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async saveProduct() {
    const productId = document.getElementById('product-id').value;
    const product = {
      name: document.getElementById('product-name').value,
      category: document.getElementById('product-category').value,
      description: document.getElementById('product-description').value,
      price: parseFloat(document.getElementById('product-price').value),
      stock: parseInt(document.getElementById('product-stock').value)
    };

    try {
      setLoading(true, 'Saving product...');

      const method = productId ? 'PUT' : 'POST';
      const body = productId 
        ? { ...product, id: productId, action: 'update-product' }
        : { ...product, action: 'add-product' };

      const response = await fetch('/api/admin', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        showToast(productId ? 'Product updated' : 'Product added', 'success');
        this.closeModal();
        await this.loadProducts();
      } else {
        showToast(result.message || 'Failed to save product', 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      setLoading(true, 'Deleting product...');

      const response = await fetch('/api/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Product deleted', 'success');
        await this.loadProducts();
      } else {
        showToast(result.message || 'Failed to delete product', 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }
}

// Global instance
const productManager = new ProductManager();
