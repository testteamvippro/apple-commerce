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
            <div>
              <strong>${product.name}</strong>
              ${product.sku ? '<br><small style="color: #666;">SKU: ' + product.sku + '</small>' : ''}
              ${product.colors ? '<br><small style="color: #999;">Colors: ' + product.colors + '</small>' : ''}
            </div>
          </div>
        </td>
        <td>
          <span>${product.category || 'N/A'}</span>
          ${product.brand ? '<br><small style="color: #666;">' + product.brand + '</small>' : ''}
        </td>
        <td>
          ₫${product.price.toLocaleString()}
          ${product.discount ? '<br><small style="color: #e74c3c;">-' + product.discount + '%</small>' : ''}
        </td>
        <td>
          <div>${product.quantity || 0}</div>
          ${product.warranty ? '<small style="color: #666;">' + product.warranty + 'mo warranty</small>' : ''}
        </td>
        <td>
          <span class="stock-badge ${product.quantity > 10 ? 'in-stock' : product.quantity > 0 ? 'low-stock' : 'out-of-stock'}">
            ${product.quantity > 10 ? 'In Stock' : product.quantity > 0 ? 'Low Stock' : 'Out of Stock'}
          </span>
          ${product.rating ? '<br><small>⭐ ' + product.rating.toFixed(1) + ' (' + product.reviews + ' reviews)</small>' : ''}
        </td>
        <td>
          <button onclick="productManager.openEditModal('${String(product.id)}')" class="action-btn">✏️ Edit</button>
          <button onclick="productManager.deleteProduct('${String(product.id)}')" class="action-btn danger">🗑️ Delete</button>
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
      p.category.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
    this.renderProductsTable();
  }

  openAddModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
      document.getElementById('modal-title').textContent = 'Add New Product';
      document.getElementById('product-form').reset();
      document.getElementById('product-id').value = '';
      // Set default brand
      const brandField = document.getElementById('product-brand');
      if (brandField) brandField.value = 'Apple';
      const variantsField = document.getElementById('product-variants');
      if (variantsField) variantsField.value = '';
      modal.style.display = 'flex';
    }
  }

  async openEditModal(productId) {
    const product = this.products.find(p => String(p.id) === String(productId));
    if (!product) return;

    const modal = document.getElementById('product-modal');
    if (modal) {
      document.getElementById('modal-title').textContent = 'Edit Product';
      document.getElementById('product-id').value = product.id;
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-category').value = product.category || '';
      document.getElementById('product-description').value = product.description || '';
      document.getElementById('product-price').value = product.price;
      document.getElementById('product-stock').value = product.quantity || 0;
      
      // Enhanced fields
      const colorField = document.getElementById('product-color');
      if (colorField) {
        colorField.value = Array.isArray(product.colors) 
          ? product.colors.join(', ')
          : product.colors || '';
      }

      const storageField = document.getElementById('product-storage');
      if (storageField) {
        storageField.value = Array.isArray(product.storage)
          ? product.storage.join(', ')
          : product.storage || '';
      }

      const variantsField = document.getElementById('product-variants');
      if (variantsField) {
        variantsField.value = Array.isArray(product.variants) && product.variants.length > 0
          ? JSON.stringify(product.variants, null, 2)
          : '';
      }

      const specsField = document.getElementById('product-specs');
      if (specsField) {
        specsField.value = typeof product.specs === 'object'
          ? JSON.stringify(product.specs, null, 2)
          : product.specs || '';
      }

      const skuField = document.getElementById('product-sku');
      if (skuField) skuField.value = product.sku || '';

      const brandField = document.getElementById('product-brand');
      if (brandField) brandField.value = product.brand || 'Apple';

      const ratingField = document.getElementById('product-rating');
      if (ratingField) ratingField.value = product.rating || '';

      const reviewsField = document.getElementById('product-reviews');
      if (reviewsField) reviewsField.value = product.reviews || 0;

      const discountField = document.getElementById('product-discount');
      if (discountField) discountField.value = product.discount || 0;

      const imageField = document.getElementById('product-image');
      if (imageField) imageField.value = product.image || '';

      const warrantyField = document.getElementById('product-warranty');
      if (warrantyField) warrantyField.value = product.warranty || 12;

      const availabilityField = document.getElementById('product-availability');
      if (availabilityField) availabilityField.value = product.availability || 'in-stock';

      modal.style.display = 'flex';
    }
  }

  closeModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  parseColors() {
    const colorField = document.getElementById('product-color');
    if (!colorField || !colorField.value) return [];
    return colorField.value.split(',').map(c => c.trim()).filter(c => c);
  }

  parseStorage() {
    const storageField = document.getElementById('product-storage');
    if (!storageField || !storageField.value) return [];
    return storageField.value.split(',').map(s => s.trim()).filter(s => s);
  }

  parseSpecs() {
    const specsField = document.getElementById('product-specs');
    if (!specsField || !specsField.value) return {};
    
    try {
      return JSON.parse(specsField.value);
    } catch (e) {
      console.warn('Invalid JSON in specs field');
      return {};
    }
  }

  parseVariants() {
    const variantsField = document.getElementById('product-variants');
    if (!variantsField || !variantsField.value.trim()) return [];

    try {
      const parsed = JSON.parse(variantsField.value);
      if (!Array.isArray(parsed)) {
        throw new Error('Variants must be an array');
      }

      return parsed
        .map(variant => ({
          storage: String(variant.storage || '').trim(),
          color: String(variant.color || '').trim(),
          region: String(variant.region || '').trim(),
          price: Number(variant.price || 0)
        }))
        .filter(variant => variant.storage || variant.color || variant.region || variant.price > 0);
    } catch (error) {
      throw new Error('Invalid variants JSON');
    }
  }

  buildProductPayload() {
    const variants = this.parseVariants();
    const variantPrices = variants.map(variant => Number(variant.price || 0)).filter(price => price > 0);
    const derivedColors = [...new Set(variants.map(variant => variant.color).filter(Boolean))];
    const derivedStorage = [...new Set(variants.map(variant => variant.storage).filter(Boolean))];

    return {
      name: document.getElementById('product-name').value,
      category: document.getElementById('product-category').value,
      description: document.getElementById('product-description').value,
      price: variantPrices.length > 0
        ? Math.min(...variantPrices)
        : parseFloat(document.getElementById('product-price').value),
      quantity: parseInt(document.getElementById('product-stock').value),
      colors: derivedColors.length > 0 ? derivedColors : this.parseColors(),
      storage: derivedStorage.length > 0 ? derivedStorage : this.parseStorage(),
      variants,
      specs: this.parseSpecs(),
      sku: document.getElementById('product-sku').value,
      brand: document.getElementById('product-brand').value,
      rating: parseFloat(document.getElementById('product-rating').value || 0),
      reviews: parseInt(document.getElementById('product-reviews').value || 0),
      discount: parseInt(document.getElementById('product-discount').value || 0),
      image: document.getElementById('product-image').value,
      warranty: parseInt(document.getElementById('product-warranty').value || 12),
      availability: document.getElementById('product-availability').value
    };
  }

  async saveProduct() {
    const productId = document.getElementById('product-id').value;

    try {
      setLoading(true, 'Saving product...');
      const product = this.buildProductPayload();

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
