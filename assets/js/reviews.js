/* =====================================================================
   Apple Store VN — Reviews & Ratings Module
   Features: Star ratings · Review management · Local storage persistence
   Sorting & filtering · Rich text reviews · Helpful votes
   ===================================================================== */

const Reviews = {
    // Get all reviews for a product
    getProductReviews: (productId) => {
        const key = `reviews_${productId}`;
        return Storage.get(key, []);
    },

    // Add new review
    addReview: (productId, reviewData) => {
        const reviews = Reviews.getProductReviews(productId);
        const newReview = {
            id: Date.now(),
            productId,
            author: reviewData.author || 'Anonymous',
            email: reviewData.email || '',
            rating: Math.max(1, Math.min(5, reviewData.rating || 5)),
            title: reviewData.title || '',
            comment: reviewData.comment || '',
            verified: reviewData.verified || false,
            helpful: 0,
            unhelpful: 0,
            createdAt: new Date().toISOString(),
            verified_purchase: reviewData.verified_purchase || false
        };

        reviews.push(newReview);
        Storage.set(`reviews_${productId}`, reviews);

        return newReview;
    },

    // Get review statistics
    getStats: (productId) => {
        const reviews = Reviews.getProductReviews(productId);
        if (reviews.length === 0) {
            return {
                average: 0,
                total: 0,
                distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        }

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let sum = 0;

        reviews.forEach(review => {
            distribution[review.rating]++;
            sum += review.rating;
        });

        const average = (sum / reviews.length).toFixed(1);
        const percentages = {};

        Object.keys(distribution).forEach(rating => {
            percentages[rating] = Math.round((distribution[rating] / reviews.length) * 100);
        });

        return {
            average: parseFloat(average),
            total: reviews.length,
            distribution,
            percentages
        };
    },

    // Mark review as helpful
    markHelpful: (productId, reviewId) => {
        const reviews = Reviews.getProductReviews(productId);
        const review = reviews.find(r => r.id === reviewId);
        
        if (review) {
            review.helpful = (review.helpful || 0) + 1;
            Storage.set(`reviews_${productId}`, reviews);
        }
        
        return review;
    },

    // Delete review
    deleteReview: (productId, reviewId) => {
        let reviews = Reviews.getProductReviews(productId);
        reviews = reviews.filter(r => r.id !== reviewId);
        Storage.set(`reviews_${productId}`, reviews);
    },

    // Sort reviews
    getSorted: (productId, sortBy = 'recent') => {
        let reviews = [...Reviews.getProductReviews(productId)];

        switch(sortBy) {
            case 'recent':
                reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'highest':
                reviews.sort((a, b) => b.rating - a.rating);
                break;
            case 'lowest':
                reviews.sort((a, b) => a.rating - b.rating);
                break;
            case 'helpful':
                reviews.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
                break;
        }

        return reviews;
    },

    // Filter reviews by rating
    filterByRating: (productId, rating) => {
        const reviews = Reviews.getProductReviews(productId);
        if (rating === 0) return reviews;
        return reviews.filter(r => r.rating === rating);
    },

    // Render star rating display
    renderStars: (rating, size = 'normal') => {
        const sizeClass = size === 'small' ? 'text-sm' : 'text-lg';
        let html = `<div class="rating ${sizeClass}">`;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                html += `<span class="star active">★</span>`;
            } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                html += `<span class="star half">★</span>`;
            } else {
                html += `<span class="star">★</span>`;
            }
        }
        
        html += `</div>`;
        return html;
    },

    // Render review form
    renderReviewForm: (productId) => {
        return `
            <div class="review-form card">
                <h3 class="form-label" style="font-size: 16px; margin-bottom: 16px;">Viết Đánh Giá Của Bạn</h3>
                <form id="reviewForm_${productId}">
                    <div class="form-group">
                        <label class="form-label">Tên Của Bạn *</label>
                        <input type="text" name="author" class="form-input" placeholder="Nhập tên của bạn" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" name="email" class="form-input" placeholder="nhập@email.com" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Đánh Giá *</label>
                        <div class="rating-input" id="ratingInput_${productId}">
                            <span class="star" data-rating="1">★</span>
                            <span class="star" data-rating="2">★</span>
                            <span class="star" data-rating="3">★</span>
                            <span class="star" data-rating="4">★</span>
                            <span class="star" data-rating="5">★</span>
                        </div>
                        <input type="hidden" name="rating" value="5" id="rating_${productId}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Tiêu Đề Đánh Giá *</label>
                        <input type="text" name="title" class="form-input" placeholder="Vd: Sản phẩm tuyệt vời!" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Nhận Xét *</label>
                        <textarea name="comment" class="form-textarea" placeholder="Chia sẻ trải nghiệm của bạn..." required></textarea>
                    </div>

                    <label class="checkbox-group" style="margin-bottom: 16px;">
                        <input type="checkbox" name="verified_purchase" value="1">
                        <span>Tôi đã mua sản phẩm này</span>
                    </label>

                    <button type="submit" class="btn btn-primary btn-full">Gửi Đánh Giá</button>
                </form>
            </div>
        `;
    },

    // Render single review
    renderReview: (review) => {
        const starsHtml = Reviews.renderStars(review.rating);
        const helpfulPercent = review.helpful || 0;

        return `
            <div class="review-item card" data-review-id="${review.id}">
                <div class="review-header">
                    <div class="review-rating">
                        ${starsHtml}
                        <span class="review-rating-value">${review.rating.toFixed(1)}</span>
                    </div>
                    ${review.verified_purchase ? '<span class="badge badge-success">✓ Đã Xác Minh</span>' : ''}
                </div>

                <div class="review-title">${review.title}</div>
                <div class="review-meta">
                    <span class="review-author">${review.author}</span>
                    <span class="review-date">${Format.date(review.createdAt)}</span>
                </div>

                <p class="review-text">${review.comment.substring(0, 500)}${review.comment.length > 500 ? '...' : ''}</p>

                <div class="review-actions">
                    <button class="review-helpful-btn" onclick="Reviews.markHelpful(${review.productId}, ${review.id}); event.target.disabled = true;">
                        👍 Hữu ích (${helpfulPercent})
                    </button>
                </div>
            </div>
        `;
    },

    // Render all reviews with stats
    renderReviewsSection: (productId) => {
        const stats = Reviews.getStats(productId);
        const reviews = Reviews.getSorted(productId, 'recent');

        let html = `
            <div class="reviews-section">
                <h2 style="margin-bottom: 24px;">Đánh Giá Từ Khách Hàng</h2>

                <div class="reviews-stats">
                    <div class="stat-box">
                        <div class="stat-average">${stats.average.toFixed(1)}</div>
                        <div class="stat-stars">${Reviews.renderStars(stats.average)}</div>
                        <div class="stat-count">${stats.total} đánh giá</div>
                    </div>

                    <div class="stat-bars">
        `;

        for (let i = 5; i >= 1; i--) {
            const percentage = stats.percentages[i] || 0;
            html += `
                <div class="stat-bar-row">
                    <span class="stat-bar-label">${i} ⭐</span>
                    <div class="stat-bar-container">
                        <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="stat-bar-percent">${percentage}%</span>
                </div>
            `;
        }

        html += `
                    </div>
                </div>

                <div class="reviews-controls">
                    <select id="sortReviews_${productId}" class="form-select" onchange="Reviews.renderReviewsList(${productId}, this.value)">
                        <option value="recent">Mới Nhất</option>
                        <option value="highest">Cao Nhất</option>
                        <option value="lowest">Thấp Nhất</option>
                        <option value="helpful">Hữu Ích Nhất</option>
                    </select>
                </div>

                <div id="reviewsList_${productId}" class="reviews-list">
                    ${reviews.length === 0 ? '<p style="text-align: center; color: var(--gray-600);">Chưa có đánh giá nào</p>' : ''}
                    ${reviews.map(r => Reviews.renderReview(r)).join('')}
                </div>

                ${Reviews.renderReviewForm(productId)}
            </div>
        `;

        return html;
    },

    // Render list of reviews (for updates)
    renderReviewsList: (productId, sortBy = 'recent') => {
        const reviews = Reviews.getSorted(productId, sortBy);
        const container = document.getElementById(`reviewsList_${productId}`);
        
        if (!container) return;

        if (reviews.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--gray-600);">Chưa có đánh giá nào</p>';
            return;
        }

        container.innerHTML = reviews.map(r => Reviews.renderReview(r)).join('');
    },

    // Initialize review form
    initReviewForm: (productId) => {
        const form = document.getElementById(`reviewForm_${productId}`);
        if (!form) return;

        // Rating stars interaction
        const ratingStars = document.querySelectorAll(`#ratingInput_${productId} .star`);
        ratingStars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = star.dataset.rating;
                document.getElementById(`rating_${productId}`).value = rating;
                ratingStars.forEach((s, i) => {
                    s.classList.toggle('active', i < rating);
                });
            });
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = DOM.getFormData(form);
            const errors = Validator.validateForm(form);

            if (Object.keys(errors).length > 0) {
                Toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
                return;
            }

            Reviews.addReview(productId, formData);
            Toast.success('Đánh giá của bạn đã được gửi!');
            form.reset();
            document.getElementById(`rating_${productId}`).value = 5;
            ratingStars.forEach((s, i) => {
                s.classList.toggle('active', i < 5);
            });

            Reviews.renderReviewsList(productId, 'recent');
        });
    }
};

console.log('✅ Reviews module loaded');
