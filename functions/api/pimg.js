import { handlePimg } from '../../server/settings.js';
export const onRequestGet = ({ request, env }) => handlePimg(request, env);
