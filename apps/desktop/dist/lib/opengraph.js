"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOpenGraph = fetchOpenGraph;
async function fetchOpenGraph(url) {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VaultyBot/1.0",
            },
        });
        if (!response.ok)
            return {};
        const html = await response.text();
        const titleMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["'](.*?)["']/i) ||
            html.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["']og:title["']/i) ||
            html.match(/<title>(.*?)<\/title>/i);
        const descMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:description|description)["']\s+content=["'](.*?)["']/i) ||
            html.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["'](?:og:description|description)["']/i);
        const imgMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["'](.*?)["']/i) ||
            html.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["']og:image["']/i);
        return {
            title: titleMatch ? decodeHTMLEntities(titleMatch[1]) : undefined,
            description: descMatch ? decodeHTMLEntities(descMatch[1]) : undefined,
            image: imgMatch ? decodeHTMLEntities(imgMatch[1]) : undefined,
        };
    }
    catch (error) {
        console.error("Failed to fetch OpenGraph for", url, error);
        return {};
    }
}
function decodeHTMLEntities(text) {
    if (!text)
        return text;
    return text
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#x([0-9a-fA-F]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}
