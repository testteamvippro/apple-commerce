/* =====================================================================
   Apple Store VN — Search & Advanced Filtering Module
   Features: Full-text search · Category filtering · Price range
   Sorting · Recent searches · Search suggestions
   ===================================================================== */

const Search = {
    storageKey: 'searchHistory',
    maxHistory: 10,

    // Get search history
    getHistory: () => {
        return Storage.get(Search.storageKey, []);
    },

    // Add to search history
    addToHistory: (query) => {
        if (!query || query.trim().length === 0) return;

        let history = Search.getHistory();
        
        // Remove duplicate
        history = history.filter(item => item.query !== query);
        
        // Add new search
        history.unshift({
            query: query.trim(),
            timestamp: new Date().toISOString()
        });

        // Keep only last 10
        history = history.slice(0, Search.maxHistory);

        Storage.set(Search.storageKey, history);
    },

    // Clear search history
    clearHistory: () => {
        Storage.remove(Search.storageKey);
    },

    // Search products
    searchProducts: (products, query, filters = {}) => {
        if (!query || query.trim().length === 0) {
            return Search.filterProducts(products, filters);
        }

        const q = query.toLowerCase();
        let results = products.filter(product => {
            const searchableText = `
                ${product.name}
                ${product.description}
                ${product.category}
                ${product.specs ? product.specs.join(' ') : ''}
            `.toLowerCase();

            return searchableText.includes(q);
        });

        return Search.filterProducts(results, filters);
    },

    // Filter products
    filterProducts: (products, filters = {}) => {
        let filtered = [...products];

        // Category filter
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(p => p.category === filters.category);
        }

        // Condition filter
        if (filters.condition && filters.condition !== 'all') {
            filtered = filtered.filter(p => p.condition === filters.condition);
        }

        // Price range filter
        if (filters.minPrice || filters.maxPrice) {
            filtered = filtered.filter(p => {
                const price = p.price || Math.min(...(p.variants?.map(v => v.price) || [0]));
                const min = filters.minPrice || 0;
                const max = filters.maxPrice || Infinity;
                return price >= min && price <= max;
            });
        }

        // Rating filter
        if (filters.minRating) {
            filtered = filtered.filter(p => {
                const stats = Reviews.getStats(p.id);
                return stats.average >= filters.minRating;
            });
        }

        // Storage filter
        if (filters.storage && filters.storage !== 'all') {
            filtered = filtered.filter(p => {
                if (!p.variants) return false;
                return p.variants.some(v => v.storage === filters.storage);
            });
        }

        // Color filter
        if (filters.color && filters.color !== 'all') {
            filtered = filtered.filter(p => {
                if (!p.variants) return false;
                return p.variants.some(v => v.color === filters.color);
            });
        }

        // Sort results
        if (filters.sortBy) {
            filtered = Search.sortProducts(filtered, filters.sortBy);
        }

        return filtered;
    },

    // Sort products
    sortProducts: (products, sortBy) => {
        const sorted = [...products];

        switch(sortBy) {
            case 'price_asc':
                sorted.sort((a, b) => {
                    const priceA = a.price || Math.min(...(a.variants?.map(v => v.price) || [0]));
                    const priceB = b.price || Math.min(...(b.variants?.map(v => v.price) || [0]));
                    return priceA - priceB;
                });
                break;

            case 'price_desc':
                sorted.sort((a, b) => {
                    const priceA = a.price || Math.min(...(a.variants?.map(v => v.price) || [0]));
                    const priceB = b.price || Math.min(...(b.variants?.map(v => v.price) || [0]));
                    return priceB - priceA;
                });
                break;

            case 'name_asc':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;

            case 'name_desc':
                sorted.sort((a, b) => b.name.localeCompare(a.name));
                break;

            case 'rating':
                sorted.sort((a, b) => {
                    const ratingA = Reviews.getStats(a.id).average;
                    const ratingB = Reviews.getStats(b.id).average;
                    return ratingB - ratingA;
                });
                break;

            case 'newest':
                sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
                break;
        }

        return sorted;
    },

    // Get unique values for filters
    getFilterOptions: (products) => {
        const categories = [...new Set(products.map(p => p.category))];
        const conditions = [...new Set(products.map(p => p.condition))];
        
        const storages = new Set();
        const colors = new Set();

        products.forEach(p => {
            if (p.variants) {
                p.variants.forEach(v => {
                    if (v.storage) storages.add(v.storage);
                    if (v.color) colors.add(v.color);
                });
            }
        });

        const prices = products
            .map(p => p.price || Math.min(...(p.variants?.map(v => v.price) || [0])))
            .filter(p => !isNaN(p));

        return {
            categories,
            conditions,
            storages: Array.from(storages),
            colors: Array.from(colors),
            priceMin: Math.min(...prices),
            priceMax: Math.max(...prices)
        };
    },

    // Render search bar
    renderSearchBar: () => {
        return `
            <div class="search-container">
                <div class="search-input-wrapper">
                    <input type="text" 
                           id="searchInput" 
                           class="form-input search-input" 
                           placeholder="Tìm kiếm sản phẩm..."
                           autocomplete="off">
                    <button class="search-clear-btn" id="searchClear" style="display: none;">✕</button>
                    <div id="searchSuggestions" class="search-suggestions" style="display: none;"></div>
                </div>
            </div>
        `;
    },

    // Render advanced filters
    renderFilters: (filterOptions) => {
        return `
            <div class="filters-panel">
                <h3>Bộ Lọc</h3>

                <div class="filter-group">
                    <label class="filter-label">Danh Mục</label>
                    <select id="filterCategory" class="form-select">
                        <option value="all">Tất Cả</option>
                        ${filterOptions.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>

                <div class="filter-group">
                    <label class="filter-label">Tình Trạng</label>
                    <select id="filterCondition" class="form-select">
                        <option value="all">Tất Cả</option>
                        ${filterOptions.conditions.map(cond => `<option value="${cond}">${cond}</option>`).join('')}
                    </select>
                </div>

                <div class="filter-group">
                    <label class="filter-label">Kho Lưu Trữ</label>
                    <select id="filterStorage" class="form-select">
                        <option value="all">Tất Cả</option>
                        ${filterOptions.storages.map(storage => `<option value="${storage}">${storage}</option>`).join('')}
                    </select>
                </div>

                <div class="filter-group">
                    <label class="filter-label">Màu Sắc</label>
                    <select id="filterColor" class="form-select">
                        <option value="all">Tất Cả</option>
                        ${filterOptions.colors.map(color => `<option value="${color}">${color}</option>`).join('')}
                    </select>
                </div>

                <div class="filter-group">
                    <label class="filter-label">Khoảng Giá</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="number" 
                               id="filterMinPrice" 
                               class="form-input" 
                               placeholder="Tối thiểu"
                               min="0">
                        <input type="number" 
                               id="filterMaxPrice" 
                               class="form-input" 
                               placeholder="Tối đa"
                               min="0">
                    </div>
                </div>

                <div class="filter-group">
                    <label class="filter-label">Đánh Giá Tối Thiểu</label>
                    <select id="filterRating" class="form-select">
                        <option value="0">Tất Cả</option>
                        <option value="4">4+ ⭐</option>
                        <option value="3">3+ ⭐</option>
                        <option value="2">2+ ⭐</option>
                        <option value="1">1+ ⭐</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label class="filter-label">Sắp Xếp Theo</label>
                    <select id="filterSort" class="form-select">
                        <option value="">Mặc Định</option>
                        <option value="price_asc">Giá: Thấp đến Cao</option>
                        <option value="price_desc">Giá: Cao đến Thấp</option>
                        <option value="name_asc">Tên: A đến Z</option>
                        <option value="name_desc">Tên: Z đến A</option>
                        <option value="rating">Đánh Giá Cao Nhất</option>
                        <option value="newest">Mới Nhất</option>
                    </select>
                </div>

                <button id="filterReset" class="btn btn-secondary btn-full">Đặt Lại Bộ Lọc</button>
            </div>
        `;
    },

    // Initialize search and filters
    init: (products, onResultsChange) => {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        const filterOptions = Search.getFilterOptions(products);

        // Debounced search
        const handleSearch = Timing.debounce(() => {
            const query = searchInput.value;
            const filters = {
                category: document.getElementById('filterCategory')?.value,
                condition: document.getElementById('filterCondition')?.value,
                storage: document.getElementById('filterStorage')?.value,
                color: document.getElementById('filterColor')?.value,
                minPrice: parseInt(document.getElementById('filterMinPrice')?.value) || null,
                maxPrice: parseInt(document.getElementById('filterMaxPrice')?.value) || null,
                minRating: parseInt(document.getElementById('filterRating')?.value) || 0,
                sortBy: document.getElementById('filterSort')?.value
            };

            const results = Search.searchProducts(products, query, filters);
            if (onResultsChange) onResultsChange(results);

            if (query.trim()) {
                Search.addToHistory(query);
            }
        }, 300);

        // Search input
        searchInput.addEventListener('input', handleSearch);

        // Filter changes
        document.getElementById('filterCategory')?.addEventListener('change', handleSearch);
        document.getElementById('filterCondition')?.addEventListener('change', handleSearch);
        document.getElementById('filterStorage')?.addEventListener('change', handleSearch);
        document.getElementById('filterColor')?.addEventListener('change', handleSearch);
        document.getElementById('filterMinPrice')?.addEventListener('input', handleSearch);
        document.getElementById('filterMaxPrice')?.addEventListener('input', handleSearch);
        document.getElementById('filterRating')?.addEventListener('change', handleSearch);
        document.getElementById('filterSort')?.addEventListener('change', handleSearch);

        // Reset filters
        document.getElementById('filterReset')?.addEventListener('click', () => {
            searchInput.value = '';
            document.getElementById('filterCategory').value = 'all';
            document.getElementById('filterCondition').value = 'all';
            document.getElementById('filterStorage').value = 'all';
            document.getElementById('filterColor').value = 'all';
            document.getElementById('filterMinPrice').value = '';
            document.getElementById('filterMaxPrice').value = '';
            document.getElementById('filterRating').value = '0';
            document.getElementById('filterSort').value = '';
            handleSearch();
            Toast.info('Đã đặt lại bộ lọc');
        });
    }
};
