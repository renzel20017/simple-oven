import { handleQr } from '../../server/settings.js';
export const onRequestGet = ({ request, env }) => handleQr(request, env);
