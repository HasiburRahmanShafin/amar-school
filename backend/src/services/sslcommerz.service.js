// Thin wrapper around the SSLCommerz REST API (sandbox by default - see
// SSLCOMMERZ_IS_LIVE in .env). Two calls only: `initiatePayment` kicks off a
// checkout session and hands back the URL to redirect the admin to, and
// `validateTransaction` re-confirms a completed payment server-side against
// SSLCommerz's Order Validation API before we ever trust it - the
// success-page redirect alone is not proof of payment, since it's just a
// browser redirect the client could forge.
//
// Docs: https://developer.sslcommerz.com/doc/v4/

const STORE_ID = process.env.SSLCOMMERZ_STORE_ID;
const STORE_PASSWORD = process.env.SSLCOMMERZ_STORE_PASSWORD;
const IS_LIVE = String(process.env.SSLCOMMERZ_IS_LIVE).toLowerCase() === 'true';

const BASE_URL = IS_LIVE ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';
const INIT_URL = `${BASE_URL}/gwprocess/v4/api.php`;
const VALIDATION_URL = `${BASE_URL}/validator/api/validationserverAPI.php`;

const hasCredentials = () => Boolean(STORE_ID && STORE_PASSWORD);

// @param params.tranId       unique transaction id we generated (Invoice.tranId)
// @param params.amount       total amount in `currency`
// @param params.currency     defaults to BDT
// @param params.productName  human-readable line item, e.g. "Premium plan - monthly subscription"
// @param params.customer     { name, email, phone, address, city }
// @param params.callbackUrls { success, fail, cancel, ipn } - absolute URLs
//
// Returns { success: true, gatewayUrl, sessionKey } on success, or
// { success: false, message } if SSLCommerz rejects the request (bad
// credentials, missing fields, etc.) - callers should surface `message`
// to the admin rather than a generic error.
const initiatePayment = async ({ tranId, amount, currency = 'BDT', productName, customer, callbackUrls }) => {
  if (!hasCredentials()) {
    return {
      success: false,
      message:
        'Online payment is not configured yet. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD in the backend .env file.',
    };
  }

  const body = new URLSearchParams({
    store_id: STORE_ID,
    store_passwd: STORE_PASSWORD,
    total_amount: String(amount),
    currency,
    tran_id: tranId,
    success_url: callbackUrls.success,
    fail_url: callbackUrls.fail,
    cancel_url: callbackUrls.cancel,
    ipn_url: callbackUrls.ipn,

    cus_name: customer?.name || 'School Admin',
    cus_email: customer?.email || 'admin@example.com',
    cus_add1: customer?.address || 'N/A',
    cus_city: customer?.city || 'Dhaka',
    cus_country: 'Bangladesh',
    cus_phone: customer?.phone || '01700000000',

    shipping_method: 'NO',
    num_of_item: '1',
    product_name: productName,
    product_category: 'Subscription',
    product_profile: 'general',
  });

  try {
    const response = await fetch(INIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await response.json();

    if (data.status === 'SUCCESS' && data.GatewayPageURL) {
      return { success: true, gatewayUrl: data.GatewayPageURL, sessionKey: data.sessionkey };
    }
    return { success: false, message: data.failedreason || 'SSLCommerz rejected the payment request' };
  } catch (error) {
    return { success: false, message: `Could not reach the payment gateway: ${error.message}` };
  }
};

// Re-validates a val_id (returned by SSLCommerz on the success callback)
// server-to-server. This is the step that actually proves the payment
// happened - never mark an invoice paid off the redirect alone.
const validateTransaction = async (valId) => {
  if (!hasCredentials()) {
    return { valid: false, message: 'SSLCommerz credentials are not configured' };
  }

  const params = new URLSearchParams({
    val_id: valId,
    store_id: STORE_ID,
    store_passwd: STORE_PASSWORD,
    format: 'json',
  });

  try {
    const response = await fetch(`${VALIDATION_URL}?${params.toString()}`);
    const data = await response.json();

    const isValid = data.status === 'VALID' || data.status === 'VALIDATED';
    return { valid: isValid, data };
  } catch (error) {
    return { valid: false, message: `Could not validate transaction: ${error.message}` };
  }
};

module.exports = { initiatePayment, validateTransaction, hasCredentials };
