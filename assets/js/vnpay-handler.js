class VNPayHandler {
  constructor(merchantCode, hashSecret) {
    this.merchantCode = merchantCode;
    this.hashSecret = hashSecret;
  }

  async createPaymentUrl(amount, orderId, returnUrl = null) {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vnpay-create-payment',
          amount,
          orderId,
          returnUrl: returnUrl || window.location.origin + '/order-confirmation.html'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.data.paymentUrl;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  }

  async redirectToPayment(amount, orderId) {
    try {
      const paymentUrl = await this.createPaymentUrl(amount, orderId);
      window.location.href = paymentUrl;
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async verifyCallback(params) {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vnpay-verify',
          params
        })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }

  static getPaymentStatus(responseCode) {
    const statusMap = {
      '00': 'Success',
      '01': 'Bank rejected transaction',
      '02': 'Card locked',
      '03': 'Unknown card issuer',
      '04': 'Card expired',
      '05': 'Transaction declined',
      '06': 'Contact merchant',
      '07': 'Hold card',
      '08': 'Invalid transaction',
      '09': 'Duplicate transaction',
      '10': 'Refund request',
      '99': 'User cancelled'
    };
    return statusMap[responseCode] || 'Unknown error';
  }
}
