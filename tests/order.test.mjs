// Run: node tests/order.test.mjs   (checks the order + payment-proof logic)
import assert from 'node:assert/strict';
import { validateOrder } from '../server/order.js';
import { validateProof } from '../server/payment-proof.js';
import { PRODUCTS, SHOP, nextOpenDates, addDays } from '../public/js/products.js';

const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const day = nextOpenDates(addDays(today, 3), 1)[0];
const base = { name: 'Ana Reyes', phone: '0917 123 4567', fulfillment: 'delivery', zone: 'near', address: '12 Mabini St, Makati City', date: day, time: 'Any time', payment: 'GCash' };
const one = [{ pid: 'sampler', vid: '4', qty: 1 }];

let r = validateOrder({ ...base, items: [{ pid: 'brown-butter', vid: '8', qty: 2, price: 1 }, { pid: 'biscoff-revel', vid: 'box', qty: 1 }] });
assert.deepEqual(r.errors, {}); assert.equal(r.order.subtotal, 740 * 2 + 660, 'server prices are used, not client prices');
assert.equal(r.order.fulfillment, 'pickup', 'always pick-up');

r = validateOrder({ ...base, items: [{ pid: 'red-velvet', vid: '4', qty: 1 }, { pid: 'red-velvet', vid: '4', qty: 2 }] });
assert.equal(r.order.lines.length, 1); assert.equal(r.order.lines[0].qty, 3, 'duplicate lines merge');
assert.equal(validateOrder({ ...base, items: [{ pid: 'red-velvet', vid: '4', qty: 999 }] }).order.lines[0].qty, 20, 'qty is capped');

assert.ok(validateOrder({ ...base, items: [{ pid: 'nope', vid: '4', qty: 1 }] }).errors.items, 'unknown products rejected');
assert.ok(validateOrder({ ...base, phone: '12', items: one }).errors.phone);
assert.deepEqual(validateOrder({ ...base, address: '', zone: '', items: one }).errors, {}, 'no address needed');
assert.equal(validateOrder({ ...base, pickupBy: 'rider', items: one }).order.pickupBy, 'rider', 'own rider kept');
assert.equal(validateOrder({ ...base, pickupBy: 'drone', items: one }).order.pickupBy, 'self', 'unknown pickupBy → self');
assert.deepEqual(validateOrder({ ...base, fulfillment: 'pickup', address: '', zone: '', items: one }).errors, {}, 'pick-up needs no address/area');
assert.ok(validateOrder({ ...base, date: '2020-01-01', items: one }).errors.date, 'past date rejected');
assert.ok(validateOrder({ ...base, date: SHOP.closedDates.find((d) => d >= today) || '2099-12-25', items: one }).errors.date || !SHOP.closedDates.length, 'closed date rejected');

// gift
assert.ok(validateOrder({ ...base, gift: true, giftTo: '', items: one }).errors.giftTo, 'gift needs recipient');
r = validateOrder({ ...base, gift: true, giftTo: 'Lola Nena', giftNote: 'Happy 80th!', giftHidePrices: true, items: one });
assert.deepEqual(r.errors, {}); assert.equal(r.order.giftTo, 'Lola Nena'); assert.equal(r.order.giftHidePrices, true);
assert.equal(validateOrder({ ...base, gift: false, giftTo: 'x', items: one }).order.giftTo, '', 'gift fields cleared when not a gift');

// sold out
const rv = PRODUCTS.find((p) => p.id === 'red-velvet'); rv.soldOut = true;
assert.match(validateOrder({ ...base, items: [{ pid: 'red-velvet', vid: '4', qty: 1 }] }).errors.items || '', /sold out/, 'sold-out items rejected');
rv.soldOut = false;

// payment proof
const png = 'data:image/png;base64,' + Buffer.from('fakepng').toString('base64');
assert.deepEqual(validateProof({ orderId: 'so-261023-7kqh', phone: '09171234567', image: png }).errors, {}, 'valid proof');
assert.ok(validateProof({ orderId: 'hello', phone: '09171234567', image: png }).errors.orderId);
assert.ok(validateProof({ orderId: 'SO-261023-7KQH', phone: '1', image: png }).errors.phone);
assert.ok(validateProof({ orderId: 'SO-261023-7KQH', phone: '09171234567', image: 'data:text/html;base64,PGgxPg==' }).errors.image, 'non-images rejected');
assert.ok(validateProof({ orderId: 'SO-261023-7KQH', phone: '09171234567', image: 'data:image/png;base64,' + 'A'.repeat(5_000_000) }).errors.image, 'huge images rejected');
console.log('✓ all order + payment tests passed');
