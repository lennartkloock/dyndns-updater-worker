/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		const params = getParams(url);

		if (!params) {
			return new Response("Invalid parameters", { status: 400 });
		}

		if (params.user !== env.USER || params.password !== env.PASSWORD) {
			return new Response("Invalid credentials", { status: 401 });
		}

		if (params.ipv4) {
			const res = await fetch(`https://api.porkbun.com/api/json/v3/dns/editByNameType/${env.PORKBUN_DOMAIN}/A/${env.PORKBUN_A_RECORD}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					secretapikey: env.PORKBUN_SECRET_API_KEY,
					apikey: env.PORKBUN_API_KEY,
					content: params.ipv4,
				}),
			});

			const error = await handlePorkbunResponse(res);
			if (error) {
				return error;
			}
		}

		if (params.ipv6) {
			const res = await fetch(`https://api.porkbun.com/api/json/v3/dns/editByNameType/${env.PORKBUN_DOMAIN}/AAAA/${env.PORKBUN_AAAA_RECORD}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					secretapikey: env.PORKBUN_SECRET_API_KEY,
					apikey: env.PORKBUN_API_KEY,
					content: params.ipv6,
				}),
			});

			const error = await handlePorkbunResponse(res);
			if (error) {
				return error;
			}
		}

		return new Response("Successfully updated DNS records", { status: 200 });
	},
} satisfies ExportedHandler<Env>;

async function handlePorkbunResponse(res: Response): Promise<Response | null> {
	const data: PorkbunResponse = await res.json();

	if (data.status !== "SUCCESS") {
		console.error(data);
		return new Response("Porkbun API failed", { status: 500 });
	}

	return null;
}

interface PorkbunResponse {
	status: string;
}

interface Params {
	user: string;
	password: string;
	ipv4: string | null;
	ipv6: string | null;
}

function getParams(url: URL): Params | null {
	const user = url.searchParams.get("user");
	const password = url.searchParams.get("password");
	const ipv4 = url.searchParams.get("ipv4");
	const ipv6 = url.searchParams.get("ipv6");

	if (!user || !password) {
		return null;
	}

	return { user, password, ipv4, ipv6 };
}
