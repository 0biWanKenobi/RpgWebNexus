import type { GoogleDriveSetupContext } from "rpg_shared/sync/googleDriveTokenCrypto";

export function consumeGoogleDriveSetupContextFromUrl(urlString: string): GoogleDriveSetupContext | null {
	const url = new URL(urlString);
	const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
	const setupId = hashParams.get("setup_id")?.trim();
	const setupKey = hashParams.get("setup_key")?.trim();
	return setupId && setupKey ? { setupId, setupKey } : null;
}

export function removeGoogleDriveSetupContextFromUrl(urlString: string): string {
	const url = new URL(urlString);
	url.hash = "";
	return url.toString();
}

export function buildObsidianGoogleConnectUrl(setupId: string, payload: string): string {
	return `obsidian://rpg_nexus_configuration?${new URLSearchParams({
		setup_id: setupId,
		payload,
	}).toString()}`;
}