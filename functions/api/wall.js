import { handleWallGet, handleWallPost } from '../../server/wall.js';
export const onRequestGet = ({ request, env }) => handleWallGet(request, env);
export const onRequestPost = ({ request, env }) => handleWallPost(request, env);
