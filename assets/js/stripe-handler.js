class StripeHandler {
  constructor(publicKey) {
    this.publicKey = publicKey;
    this.stripe = Stripe(publicKey);
    this.elements = this.stripe.elements();
    this.cardElement = this.elements.create('card');
  }

  mount(containerId) {
    this.cardElement.mount(`#${containerId}`);
    this.handleCardErrors();
  }

  handleCardErrors() {
    this.cardElement.addEventListener('change', (event) => {
      const displayError = document.getElementById('card-errors');
      if (event.error) {
        displayError.textContent = event.error.message;
      } else {
        displayError.textContent = '';
      }
    });
  }

  async createPaymentIntent(amount, orderId) {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-payment-intent',
          amount,
          orderId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.data.clientSecret;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  }

  async processPayment(clientSecret, cardholderName, email) {
    try {
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: {
            name: cardholderName,
            email: email
          }
        }
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentId: result.paymentIntent.id,
          status: result.paymentIntent.status
        };
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (error) {
      throw error;
    }
  }

  async handlePayment(amount, orderId, cardholderName, email) {
    try {
      const clientSecret = await this.createPaymentIntent(amount, orderId);
      const result = await this.processPayment(clientSecret, cardholderName, email);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
