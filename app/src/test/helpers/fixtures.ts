/**
 * Shared test data factories for unit and integration tests.
 */

export function validDeviceReport(overrides?: Record<string, unknown>) {
  return {
    deviceId: 'TIP-001',
    latitude: 48.8566,
    longitude: 2.3522,
    battery: 85,
    ...overrides,
  }
}

export function validOnomonodoPayload(overrides?: Record<string, unknown>) {
  return {
    iccid: '89440000000000001',
    imei: '351234567890001',
    latitude: 48.8566,
    longitude: 2.3522,
    timestamp: new Date().toISOString(),
    battery: 75,
    ...overrides,
  }
}

export function validCargoShipment(overrides?: Record<string, unknown>) {
  return {
    type: 'CARGO_TRACKING' as const,
    name: 'Test Cargo Shipment',
    labelId: 'label-id-placeholder',
    originAddress: '123 Origin St',
    originLat: 51.5074,
    originLng: -0.1278,
    destinationAddress: '456 Destination Ave',
    destinationLat: 48.8566,
    destinationLng: 2.3522,
    ...overrides,
  }
}

export function validDispatchShipment(overrides?: Record<string, unknown>) {
  return {
    type: 'LABEL_DISPATCH' as const,
    name: 'Test Label Dispatch',
    labelIds: ['label-1', 'label-2'],
    originAddress: '123 Warehouse',
    originLat: 51.5074,
    originLng: -0.1278,
    destinationAddress: '456 Customer',
    destinationLat: 48.8566,
    destinationLng: 2.3522,
    ...overrides,
  }
}

export function validSavedAddress(overrides?: Record<string, unknown>) {
  return {
    label: 'Office',
    name: 'John Doe',
    line1: '123 Test Street',
    city: 'London',
    postalCode: 'SW1A 1AA',
    country: 'GB',
    ...overrides,
  }
}

export function stripeCheckoutSession(overrides?: Record<string, unknown>) {
  return {
    id: 'cs_test_session_001',
    payment_intent: 'pi_test_001',
    amount_total: 12500,
    currency: 'gbp',
    customer_email: 'test@tip.live',
    metadata: {
      userId: 'user-test-001',
      orgId: 'org_test_001',
      packType: 'starter',
      quantity: '1',
    },
    ...overrides,
  }
}
