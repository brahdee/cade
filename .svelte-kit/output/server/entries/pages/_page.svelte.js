import { a as push_element, d as FILENAME, i as pop_element, l as attr, n as head, u as escape_html } from "../../chunks/server2.js";
// src/routes/+page.svelte
_page[FILENAME] = "src/routes/+page.svelte";
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let url = "";
		let loading = false;
		let status = "";
		head("1uha8ag", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>cade yt downloader</title>`);
			});
		});
		$$renderer.push(`<form>`);
		push_element($$renderer, "form", 65, 0);
		$$renderer.push(`<input type="url" placeholder="youtube url goes here"${attr("value", url)} required=""/>`);
		push_element($$renderer, "input", 66, 4);
		pop_element();
		$$renderer.push(` <button type="submit"${attr("disabled", loading, true)}>`);
		push_element($$renderer, "button", 73, 4);
		$$renderer.push(`${escape_html("download audio")}</button>`);
		pop_element();
		$$renderer.push(`</form>`);
		pop_element();
		$$renderer.push(` <p aria-live="polite">`);
		push_element($$renderer, "p", 78, 0);
		$$renderer.push(`${escape_html(status)}</p>`);
		pop_element();
	}, _page);
}
_page.render = function() {
	throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export { _page as default };

//# sourceMappingURL=_page.svelte.js.map