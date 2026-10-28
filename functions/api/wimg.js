import { handleWallImg } from '../../server/wall.js';
export const onRequestGet = ({ request, env }) => handleWallImg(request, env);
