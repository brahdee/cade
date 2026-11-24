import { create_server } from './index.js';
const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	app_dir: "_app",
	app_path: "_app",
	assets: new Set([]),
	mime_types: {},
	client: {start:"_app/immutable/entry/start.Bc2iPcP6.js",app:"_app/immutable/entry/app.ryFCi7CA.js",imports:["_app/immutable/entry/start.Bc2iPcP6.js","_app/immutable/entry/payload.DSmR2FwN.js","_app/immutable/chunks/DclECHGd.js","_app/immutable/chunks/sfPjMhEP.js","_app/immutable/chunks/DWG6gcv1.js","_app/immutable/chunks/DIPcqpxd.js","_app/immutable/entry/app.ryFCi7CA.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
	
	nodes: [
		__memo(() => import('./nodes/0.js')),
		__memo(() => import('./nodes/1.js')),
		__memo(() => import('./nodes/2.js'))
	],
	remotes: {
		
	},
	routes: [
		{
			id: "/",
			pattern: /^\/$/,
			params: [],
			page: { layouts: [0,], errors: [1,], leaf: 2 },
			endpoint: null
		},
		{
			id: "/api/download",
			pattern: /^\/api\/download\/?$/,
			params: [],
			page: null,
			endpoint: __memo(() => import('./entries/endpoints/api/download/_server.ts.js'))
		}
	],
	prerendered_routes: new Set([]),
	matchers: async () => {
		return {};
	},
	server_assets: {}
}
})();
export const server = create_server(manifest);