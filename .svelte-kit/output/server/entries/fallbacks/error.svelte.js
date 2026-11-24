import { a as push_element, d as FILENAME, i as pop_element, s as getContext, u as escape_html } from "../../chunks/server2.js";
import { Y as state_read_outside_render } from "../../chunks/server-errors.js";
// node_modules/.pnpm/@sveltejs+kit@3.4.0_@sveltejs+vite-plugin-svelte@7.3.1_svelte@5.59.1_vite@8.3.8_@types+_da47268e73b1d0107c452960031c0406/node_modules/@sveltejs/kit/src/runtime/app/state/server.js
function context() {
	return getContext("__request__");
}
/** @param {string} name */
function context_dev(name) {
	try {
		return context();
	} catch {
		state_read_outside_render({ name });
	}
}
var page = {
	get data() {
		return context_dev("page.data").page.data;
	},
	get error() {
		return context_dev("page.error").page.error;
	},
	get form() {
		return context_dev("page.form").page.form;
	},
	get params() {
		return context_dev("page.params").page.params;
	},
	get route() {
		return context_dev("page.route").page.route;
	},
	get shallow() {
		return context_dev("page.shallow").page.shallow;
	},
	get state() {
		return context_dev("page.state").page.state;
	},
	get status() {
		return context_dev("page.status").page.status;
	},
	get url() {
		return context_dev("page.url").page.url;
	}
};
// node_modules/.pnpm/@sveltejs+kit@3.4.0_@sveltejs+vite-plugin-svelte@7.3.1_svelte@5.59.1_vite@8.3.8_@types+_da47268e73b1d0107c452960031c0406/node_modules/@sveltejs/kit/src/runtime/components/error.svelte
Error[FILENAME] = "node_modules/.pnpm/@sveltejs+kit@3.4.0_@sveltejs+vite-plugin-svelte@7.3.1_svelte@5.59.1_vite@8.3.8_@types+_da47268e73b1d0107c452960031c0406/node_modules/@sveltejs/kit/src/runtime/components/error.svelte";
function Error($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<h1>`);
		push_element($$renderer, "h1", 7, 0);
		$$renderer.push(`${escape_html(page.status)}</h1>`);
		pop_element();
		$$renderer.push(` <p>`);
		push_element($$renderer, "p", 8, 0);
		$$renderer.push(`${escape_html(page.error?.message)}</p>`);
		pop_element();
	}, Error);
}
Error.render = function() {
	throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export { Error as default };

//# sourceMappingURL=error.svelte.js.map