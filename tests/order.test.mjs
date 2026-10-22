// Run: node tests/order.test.mjs   (checks the order + payment-proof logic)
import assert from 'node:assert/strict';
import { validateOrder } from '../server/order.js';
import { validateProof } from '../server/payment-proof.js';
import { PRODUCTS, SHOP, nextOpenDates, addDays, applySettings, defaultSettings, earliestDate, cleanSettings } from '../public/js/products.js';

const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const day = nextOpenDates(addDays(today, 3), 1)[0];
const base = { social: '@ana', name: 'Ana Reyes', phone: '0917 123 4567', fulfillment: 'delivery', zone: 'near', address: '12 Mabini St, Makati City', date: day, time: 'Morning (9am – 12nn)', payment: 'GCash', payRef: '1012345678901', proof: 'data:image/png;base64,iVBORw0KGgo=' };
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

// ordering rules + owner settings
assert.ok(validateOrder({ ...base, date: today, items: one }).errors.date, 'same-day pick-up rejected (order a day before)');
assert.ok(validateOrder({ ...base, time: 'Midnight', items: one }).errors.time, 'unknown time rejected');
assert.equal(validateOrder({ ...base, payment: 'Cash on pick-up', items: one }).order.payment, 'GCash', 'cash on pick-up removed');
applySettings({ ...defaultSettings(), soldOut: { 'white-choco-oreo': true }, closedWeekdays: [new Date(day + 'T00:00:00Z').getUTCDay()], pickupTimes: ['1pm – 3pm'] });
assert.match(validateOrder({ ...base, time: '1pm – 3pm', items: [{ pid: 'white-choco-oreo', vid: '4', qty: 1 }] }).errors.items || '', /sold out/, 'owner sold-out applies');
assert.ok(validateOrder({ ...base, time: '1pm – 3pm', items: one }).errors.date, 'owner closed weekday applies');
assert.equal(validateOrder({ ...base, time: 'Morning (9am – 12nn)', items: one }).errors.time !== undefined, true, 'owner time list applies');
applySettings({ ...defaultSettings(), closedWeekdays: [new Date(day + 'T00:00:00Z').getUTCDay()], openDates: [day], pickupTimes: ['1pm – 3pm'] });
assert.deepEqual(validateOrder({ ...base, time: '1pm – 3pm', items: one }).errors, {}, 'open-date exception applies');
applySettings({ ...defaultSettings(), orderCutoff: '00:00' });
assert.equal(earliestDate(), addDays(today, 2), 'cut-off time pushes earliest day');
assert.equal(cleanSettings({ pickup: { mapUrl: 'javascript:alert(1)' } }).pickup.mapUrl.startsWith('https://'), true, 'map link must be https');
assert.ok(validateOrder({ ...base, social: '', items: one }).errors.social, 'IG/FB required');
// tips
applySettings({ ...defaultSettings(), requirePayment: false });
r = validateOrder({ ...base, items: one, tip: 50 }); assert.equal(r.order.tip, 50); assert.equal(r.order.total, 410 + 50, 'tip added to total');
assert.equal(validateOrder({ ...base, items: one, tip: -20 }).order.tip, 0, 'negative tip ignored');
assert.equal(validateOrder({ ...base, items: one, tip: 999999 }).order.tip, 5000, 'tip capped');
applySettings({ ...defaultSettings(), requirePayment: false, tips: { enabled: false } });
assert.equal(validateOrder({ ...base, items: one, tip: 50 }).order.tip, 0, 'tips off → no tip');
// add-ons
applySettings({ ...defaultSettings(), requirePayment: false });
r = validateOrder({ ...base, items: [{ pid: 'brown-butter', vid: '8', qty: 2, wrap: true, ribbon: 'Pink' }, { pid: 'dark-chocolate-revel', vid: 'box', qty: 1, wrap: true, ribbon: '' }] });
assert.deepEqual(r.errors, {});
assert.equal(r.order.lines[0].total, (740 + 10 + 10) * 2, 'wrap ₱10 for 8pcs + ribbon ₱10');
assert.equal(r.order.lines[1].total, 580 + 10, 'bars: no wrap, ribbon only');
assert.match(r.order.lines[0].variant, /Individually packed · Ribbon/);
applySettings({ ...defaultSettings(), payment: { gcashName: 'A', gcashNumber: '0917 000 0000' } });
r = validateOrder({ ...base, payRef: '', proof: '', items: one });
assert.ok(r.errors.proof && !r.errors.payRef, 'pay-first: screenshot required, no reference needed');
r = validateOrder({ ...base, items: one, payRef: '1012 345 678 901', proof: 'data:image/png;base64,iVBORw0KGgo=' });
assert.deepEqual(r.errors, {}, 'pay-first: valid proof accepted'); assert.equal(r.order.payRef, '1012345678901');
applySettings({ ...defaultSettings(), payment: { gcashNumber: '0917' }, requirePayment: false });
assert.deepEqual(validateOrder({ ...base, items: one }).errors, {}, 'owner can switch pay-first off');
applySettings(defaultSettings());
assert.ok(validateOrder({ ...base, proof: '', items: one }).errors.proof, 'default: payment required (GCash/GoTyme set)');
applySettings(defaultSettings());

// payment proof
const png = 'data:image/png;base64,' + Buffer.from('fakepng').toString('base64');
assert.deepEqual(validateProof({ orderId: 'so-261023-7kqh', phone: '09171234567', image: png }).errors, {}, 'valid proof');
assert.ok(validateProof({ orderId: 'hello', phone: '09171234567', image: png }).errors.orderId);
assert.ok(validateProof({ orderId: 'SO-261023-7KQH', phone: '1', image: png }).errors.phone);
assert.ok(validateProof({ orderId: 'SO-261023-7KQH', phone: '09171234567', image: 'data:text/html;base64,PGgxPg==' }).errors.image, 'non-images rejected');
assert.ok(validateProof({ orderId: 'SO-261023-7KQH', phone: '09171234567', image: 'data:image/png;base64,' + 'A'.repeat(5_000_000) }).errors.image, 'huge images rejected');
console.log('✓ all order + payment tests passed');
